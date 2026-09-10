import { createClient } from '@supabase/supabase-js';

import { AppError } from '../middleware/errorHandler.js';

import { createServiceRoleClient } from './supabaseServiceRoleClient.js';

function userClient(authorization: string) {
  const url = process.env.SUPABASE_URL;

  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new AppError(
      'Supabase server configuration is unavailable.',
      503,
      'SUPABASE_CONFIGURATION'
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });
}

type FactoryResetAsset = Record<string, unknown>;

type AccountPurgeTarget = {
  profile_id?: string;
  auth_user_id?: string;
  name?: string;
  email?: string;
  role_id?: string;
  status_before?: string;
};

type AccountPurgeResult = {
  required?: boolean;
  profiles_archived?: number;
  auth_users_to_delete?: number;
  protected_admin_preserved?: boolean;
  targets?: AccountPurgeTarget[];
};

function isAlreadyAbsentAuthUserError(message?: string) {
  const normalized = String(message ?? '').toLowerCase();

  return (
    normalized.includes('not found') ||
    normalized.includes('does not exist') ||
    normalized.includes('user_not_found')
  );
}

export async function executeFactoryReset(
  authorization?: string,
  confirmation?: unknown,
  options?: Record<string, unknown>
) {
  /*
   * Authentication must come from the caller.
   * The browser never receives the service-role credential.
   */
  if (!authorization || !/^Bearer\s+.+$/i.test(authorization)) {
    throw new AppError(
      'Authentication is required.',
      401,
      'AUTHENTICATION_REQUIRED'
    );
  }

  /*
   * Keep the server confirmation identical to the database contract.
   */
  if (confirmation !== 'RESET WIDGETFLOW DATA') {
    throw new AppError(
      'Explicit reset confirmation is required.',
      400,
      'CONFIRMATION_REQUIRED'
    );
  }

  const client = userClient(authorization);

  const deleteUserAccounts =
    options?.delete_user_accounts === true;

  /*
   * IMPORTANT:
   *
   * Account target discovery is NOT performed by the server.
   *
   * The database RPC is authoritative for:
   * - Protected Admin exclusion
   * - exact profile targets
   * - exact auth_user_id targets
   * - archival state
   * - operation ledger
   *
   * This prevents the server from duplicating authorization/business
   * rules or querying profiles after auth_user_id has already been
   * cleared.
   */

  const rpcOptions = {
    delete_user_accounts: deleteUserAccounts,
  };

  /*
   * STEP 1
   * Execute the mode-aware transactional database reset.
   *
   * Migration 071 overload:
   *
   * admin_execute_factory_reset(
   *   p_confirmation text,
   *   p_options jsonb
   * )
   *
   * In account-purge mode the RPC:
   * - captures exact targets first
   * - runs the verified business-data reset
   * - archives non-Protected-Admin profiles
   * - clears auth_user_id
   * - returns exact original auth_user_id values
   * - leaves operation reconciliation_required when Auth cleanup remains
   */
  const { data, error } = await client.rpc(
    'admin_execute_factory_reset',
    {
      p_confirmation: confirmation,
      p_options: rpcOptions,
    }
  );

  if (error) {
    throw new AppError(
      error.message,
      409,
      'FACTORY_RESET_FAILED'
    );
  }

  const result = (data ?? {}) as Record<string, unknown>;

  const operationId =
    typeof result.operation_id === 'string'
      ? result.operation_id
      : '';

  if (!operationId) {
    throw new AppError(
      'Factory Reset did not return an operation ID.',
      502,
      'RESET_OPERATION_ID_MISSING'
    );
  }

  /*
   * STEP 2
   * Parse authoritative Storage reconciliation targets.
   */
  const assets = Array.isArray(result.external_cleanup)
    ? (result.external_cleanup as FactoryResetAsset[])
    : [];

  /*
   * Parse authoritative account-purge targets returned by Migration 071.
   */
  const accountPurge =
    result.account_purge &&
      typeof result.account_purge === 'object'
      ? (result.account_purge as AccountPurgeResult)
      : undefined;

  const purgeTargets =
    Array.isArray(accountPurge?.targets)
      ? accountPurge.targets
      : [];

  /*
   * Defensive contract validation.
   *
   * If account deletion was explicitly requested and the database says
   * Auth reconciliation is required, exact targets must be present.
   */
  if (
    deleteUserAccounts &&
    accountPurge?.required === true &&
    purgeTargets.length === 0
  ) {
    throw new AppError(
      'Factory Reset requires account reconciliation but returned no account targets.',
      502,
      'ACCOUNT_PURGE_TARGETS_MISSING'
    );
  }

  /*
   * Create privileged client only when external work is required.
   */
  const needsServiceRole =
    assets.length > 0 ||
    (deleteUserAccounts && purgeTargets.length > 0);

  const admin = needsServiceRole
    ? createServiceRoleClient()
    : null;

  const cleanedAssets: FactoryResetAsset[] = [];

  /*
   * STEP 3
   * Exact Storage reconciliation.
   */
  for (const asset of assets) {
    const bucket =
      String(asset.bucket_name ?? '').trim();

    const objectPath =
      String(asset.object_path ?? '').trim();

    if (!bucket || !objectPath || !admin) {
      cleanedAssets.push({
        ...asset,
        status: 'reconciliation_required',
        reason: 'INVALID_STORAGE_REFERENCE',
      });

      continue;
    }

    const slash = objectPath.lastIndexOf('/');

    const folder =
      slash >= 0
        ? objectPath.slice(0, slash)
        : '';

    const filename =
      slash >= 0
        ? objectPath.slice(slash + 1)
        : objectPath;

    const listed = await admin.storage
      .from(bucket)
      .list(folder, {
        search: filename,
        limit: 100,
      });

    if (listed.error) {
      throw new AppError(
        'Storage verification failed; reset requires reconciliation.',
        502,
        'STORAGE_VERIFY_FAILED'
      );
    }

    const objectExists =
      listed.data?.some(
        (entry) => entry.name === filename
      ) ?? false;

    if (objectExists) {
      const removed = await admin.storage
        .from(bucket)
        .remove([objectPath]);

      if (removed.error) {
        throw new AppError(
          'Storage cleanup failed; reset requires reconciliation.',
          502,
          'STORAGE_DELETE_FAILED'
        );
      }
    }

    const verifyAfterDelete = await admin.storage
      .from(bucket)
      .list(folder, {
        search: filename,
        limit: 100,
      });

    if (verifyAfterDelete.error) {
      throw new AppError(
        'Storage cleanup verification failed; reset requires reconciliation.',
        502,
        'STORAGE_VERIFY_FAILED'
      );
    }

    const stillExists =
      verifyAfterDelete.data?.some(
        (entry) => entry.name === filename
      ) ?? false;

    if (stillExists) {
      throw new AppError(
        'Storage object still exists; reset requires reconciliation.',
        502,
        'STORAGE_RECONCILIATION_REQUIRED'
      );
    }

    cleanedAssets.push({
      ...asset,
      status: 'physical_reconciled',
    });
  }

  /*
   * Never proceed to metadata finalization if Storage is unresolved.
   */
  if (
    assets.length > 0 &&
    cleanedAssets.some(
      (asset) =>
        asset.status !== 'physical_reconciled'
    )
  ) {
    return {
      ...result,
      external_cleanup: cleanedAssets,
      status: 'reconciliation_required',
    };
  }

  /*
   * STEP 4
   * Delete exact non-Protected-Admin Supabase Auth identities.
   *
   * No profile lookup is performed here.
   * We use only the auth_user_id values captured by the database before
   * archival.
   */
  const deletedAuthUsers: string[] = [];
  const pendingAuthUsers: string[] = [];

  if (
    deleteUserAccounts &&
    purgeTargets.length > 0
  ) {
    if (!admin) {
      throw new AppError(
        'Privileged Auth reconciliation is unavailable.',
        503,
        'AUTH_ADMIN_UNAVAILABLE'
      );
    }

    for (const target of purgeTargets) {
      const authUserId =
        String(target.auth_user_id ?? '').trim();

      /*
       * Never invent or substitute a profile ID for a missing auth ID.
       */
      if (!authUserId) {
        throw new AppError(
          'Account purge target is missing its Auth identity.',
          502,
          'ACCOUNT_PURGE_TARGET_INVALID'
        );
      }

      const { error: deleteError } =
        await admin.auth.admin.deleteUser(
          authUserId
        );

      if (deleteError) {
        /*
         * Idempotent reconciliation:
         * an already-absent Auth user means the desired state has
         * already been reached.
         */
        if (
          isAlreadyAbsentAuthUserError(
            deleteError.message
          )
        ) {
          deletedAuthUsers.push(authUserId);
          continue;
        }

        pendingAuthUsers.push(authUserId);
        continue;
      }

      deletedAuthUsers.push(authUserId);
    }
  }

  /*
   * Any partial Auth failure leaves the reset recoverable.
   * Do not falsely report completion.
   */
  if (pendingAuthUsers.length > 0) {
    return {
      ...result,

      external_cleanup: cleanedAssets,

      status: 'reconciliation_required',

      account_purge: {
        ...(accountPurge ?? {}),

        profiles_archived:
          accountPurge?.profiles_archived ??
          purgeTargets.length,

        auth_users_deleted:
          deletedAuthUsers.length,

        auth_users_remaining:
          pendingAuthUsers.length,

        pending_auth_user_ids:
          pendingAuthUsers,
      },
    };
  }

  /*
   * STEP 5
   * Authoritatively verify Auth deletion inside PostgreSQL.
   *
   * The finalizer does NOT delete auth.users.
   * It verifies that the exact captured identities are absent and updates
   * the reset ledger.
   */
  if (
    deleteUserAccounts &&
    accountPurge?.required === true
  ) {
    const {
      data: authFinalizeData,
      error: authFinalizeError,
    } = await client.rpc(
      'admin_finalize_factory_reset_account_purge',
      {
        p_operation_id: operationId,
      }
    );

    if (authFinalizeError) {
      throw new AppError(
        authFinalizeError.message,
        502,
        'AUTH_RECONCILIATION_FINALIZE_FAILED'
      );
    }

    const authFinalize =
      (authFinalizeData ?? {}) as Record<
        string,
        unknown
      >;

    if (
      authFinalize.status ===
      'reconciliation_required'
    ) {
      return {
        ...result,
        ...authFinalize,
        external_cleanup: cleanedAssets,
        status: 'reconciliation_required',
      };
    }
  }

  /*
   * STEP 6
   * Finalize asset metadata.
   *
   * Keep the already-verified Factory Reset metadata contract.
   */
  const {
    data: finalizedData,
    error: finalizedError,
  } = await client.rpc(
    'admin_finalize_factory_reset',
    {
      p_operation_id: operationId,
    }
  );

  if (finalizedError) {
    throw new AppError(
      finalizedError.message,
      502,
      'METADATA_FINALIZE_FAILED'
    );
  }

  return {
    ...((finalizedData ?? {}) as Record<
      string,
      unknown
    >),

    mode: deleteUserAccounts
      ? 'data_and_user_accounts'
      : 'data_only',

    external_cleanup: cleanedAssets,

    account_purge: deleteUserAccounts
      ? {
        ...(accountPurge ?? {}),

        profiles_archived:
          accountPurge?.profiles_archived ??
          purgeTargets.length,

        auth_users_deleted:
          deletedAuthUsers.length,

        auth_users_remaining: 0,

        protected_admin_preserved: true,

        status: 'completed',
      }
      : {
        required: false,
        profiles_archived: 0,
        auth_users_deleted: 0,
        auth_users_remaining: 0,
      },
  };
}
