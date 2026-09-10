import type { GovernanceLevel, PermissionKey, RoleType } from '../shared/permissionCatalog.js';

export type SystemRole = "Employee" | "Manager" | "Director" | "Admin";
export type Role = string;

export type EmploymentStatus = "Active" | "Inactive" | "Resigned" | "Terminated";

export type TemplateStatus = "Draft" | "Pending Approval" | "Approved" | "Rejected" | "Archived" | "Superseded";

export type ReportStatus = "Draft" | "Completed" | "Sent" | "Returned" | "Signed" | "Rejected";

export interface User {
  id: string;
  profileCode?: string;
  name: string;
  email: string;
  role: Role;
  roleId?: string;
  roleKey?: string;
  roleType?: RoleType;
  governanceLevel?: GovernanceLevel;
  permissions?: PermissionKey[];
  roleActive?: boolean;
  roleProtected?: boolean;
  avatarInitials: string;
  department: string;
  managerUserId?: string;
  managerName?: string;
  createdAt?: string;
  avatarBg: string;
  status?: EmploymentStatus;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  iconName: string;
  status?: "Active" | "Inactive";
  templateCount?: number;
}

export type WidgetLayoutType = "KPI Cards" | "Summary Table" | "Analytics Panel" | "Status Monitor" | "Custom";

export type TemplateComponentType =
  | "text"
  | "textarea"
  | "number"
  | "currency"
  | "percentage"
  | "date"
  | "datetime"
  | "select"
  | "radio"
  | "checkbox"
  | "file"
  | "rating"
  | "acknowledgement"
  | "heading"
  | "paragraph"
  | "divider"
  | "spacer"
  | "image"
  | "info_box"
  | "table"
  | "repeating_group"
  | "signature"
  | "kpi";

export type FieldInputType = TemplateComponentType;

export type ComponentLayoutWidth = "full" | "half" | "third";

export interface ComponentValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minDate?: string;
  maxDate?: string;
}

export interface RatingConfig {
  min?: number;
  max?: number;
  step?: number;
  displayStyle?: "numbers" | "stars" | "buttons";
  lowLabel?: string;
  highLabel?: string;
  showValue?: boolean;
}

export interface AcknowledgementConfig {
  statementText?: string;
  checkboxLabel?: string;
  captureTimestamp?: boolean;
}

export interface FileAttachmentConfig {
  allowedFileTypes?: string[];
  maxFileSizeMb?: number;
  allowMultiple?: boolean;
  maxFiles?: number;
}

export interface HeadingConfig {
  headingLevel?: 'h1' | 'h2' | 'h3';
  fontSize?: 'small' | 'medium' | 'large' | 'xlarge' | 'theme' | string;
  fontWeight?: 'normal' | 'medium' | 'bold' | 'extrabold' | 'theme' | string;
  fontFamily?: 'theme' | string;
  fontColor?: 'theme' | string;
  italic?: boolean;
  underline?: boolean;
  alignment?: 'left' | 'center' | 'right';
  textColor?: 'default' | 'primary' | 'emerald' | 'amber' | 'rose' | 'slate' | 'theme' | string;
  spaceAbove?: 'none' | 'small' | 'medium' | 'large' | number;
  spaceBelow?: 'none' | 'small' | 'medium' | 'large' | number;
  subtitle?: string;
}

export interface ParagraphConfig {
  contentHtml?: string;
  alignment?: 'left' | 'center' | 'right';
  fontSize?: 'small' | 'medium' | 'large' | 'theme' | string;
  fontFamily?: 'theme' | string;
  fontWeight?: 'normal' | 'medium' | 'bold' | 'theme' | string;
  fontColor?: 'theme' | string;
  lineHeight?: 'tight' | 'normal' | 'relaxed' | 'theme' | string;
  paragraphSpacing?: number;
  textColor?: 'default' | 'slate' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'theme' | string;
}

export interface DividerConfig {
  dividerStyle?: 'solid' | 'dashed' | 'dotted';
  thickness?: 'thin' | 'medium' | 'thick';
  width?: 'full' | '75%' | '50%';
  alignment?: 'left' | 'center' | 'right';
  spaceAbove?: 'none' | 'small' | 'medium' | 'large' | number;
  spaceBelow?: 'none' | 'small' | 'medium' | 'large' | number;
  dividerColor?: 'default' | 'slate' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'theme' | string;
  label?: string;
  labelFontFamily?: 'theme' | string;
  labelFontColor?: 'theme' | string;
}

export interface SpacerConfig {
  spacerSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  heightPx?: number;
}

export interface ImageConfig {
  assetUrl?: string;
  assetId?: string;
  altText?: string;
  imageWidth?: 'small' | 'medium' | 'large' | 'full';
  alignment?: 'left' | 'center' | 'right';
  fitMode?: 'contain' | 'cover' | 'natural';
  caption?: string;
  captionFontFamily?: 'theme' | string;
  captionFontSize?: 'small' | 'medium' | 'large' | 'theme' | string;
  captionFontColor?: 'theme' | string;
  captionAlignment?: 'left' | 'center' | 'right';
}

export interface InfoBoxConfig {
  stylePreset?: 'info' | 'success' | 'warning' | 'important' | 'neutral';
  title?: string;
  description?: string;
  showIcon?: boolean;
  alignment?: 'left' | 'center' | 'right';
  titleFontFamily?: 'theme' | string;
  titleFontSize?: 'small' | 'medium' | 'large' | 'theme' | string;
  titleFontColor?: 'theme' | string;
  bodyFontFamily?: 'theme' | string;
  bodyFontSize?: 'small' | 'medium' | 'large' | 'theme' | string;
  bodyFontColor?: 'theme' | string;
}

export interface InstructionalConfig {
  text?: string;
  stylePreset?: 'neutral' | 'helpful' | 'important';
  fontFamily?: 'theme' | string;
  fontSize?: 'small' | 'medium' | 'large' | 'theme' | string;
  fontColor?: 'theme' | string;
  alignment?: 'left' | 'center' | 'right';
  showIcon?: boolean;
}

export interface ComponentOption {
  label: string;
  value: string;
}

export type TableColumnType =
  | "text"
  | "textarea"
  | "number"
  | "currency"
  | "percentage"
  | "date"
  | "datetime"
  | "select"
  | "checkbox"
  | "calculated";

export interface TableCalculationOperand {
  columnKey?: string;
  value?: number;
}

export interface TableCalculationExpression {
  operator: "add" | "subtract" | "multiply" | "divide" | "percentage" | "min" | "max";
  left: TableCalculationOperand;
  right: TableCalculationOperand;
}

export type TableAggregateOperation = "SUM" | "AVG" | "MIN" | "MAX" | "COUNT";

export interface TableAggregateConfig {
  id: string;
  label: string;
  targetColumnKey?: string;
  columnKey?: string;
  operation: TableAggregateOperation;
  format?: "auto" | "number" | "currency" | "percentage" | "text";
  displayType?: "auto" | "number" | "currency" | "percentage" | "text";
  decimalPlaces?: number;
  prefix?: string;
  suffix?: string;
  alignment?: "left" | "center" | "right";
  emphasis?: "normal" | "strong";
  showLabel?: boolean;
  countMode?: "all_rows" | "non_empty";
}

export interface TableColumnConfig {
  id?: string;
  key: string;
  label: string;
  type: TableColumnType;
  required?: boolean;
  width?: string;
  placeholder?: string;
  defaultValue?: unknown;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  decimalPlaces?: number;
  options?: ComponentOption[];
  readOnly?: boolean;
  calculation?: TableCalculationExpression;
}

export interface TableConfig {
  showTitle?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
  density?: 'compact' | 'standard' | 'comfortable';
  borderStyle?: 'minimal' | 'grid' | 'clean';
  minRows?: number;
  maxRows?: number;
  allowAddRow?: boolean;
  allowDeleteRow?: boolean;
  allowDuplicateRow?: boolean;
  allowReorderRows?: boolean;
  showRowNumbers?: boolean;
  columns?: TableColumnConfig[];
  aggregates?: TableAggregateConfig[];
}

export interface RepeatingGroupConfig {
  groupTitle?: string;
  itemLabel?: string;
  minItems?: number;
  maxItems?: number;
  allowAdd?: boolean;
  allowDelete?: boolean;
  allowDuplicate?: boolean;
  allowReorder?: boolean;
  allowCollapse?: boolean;
  displayStyle?: 'card' | 'compact';
}

export interface BuilderValidationIssue {
  componentId?: string;
  sectionId?: string;
  area?: 'component' | 'workflow' | 'template';
  code: string;
  message: string;
  fieldKey?: string;
}

export interface UserSignatureProfile {
  id: string;
  userId: string;
  method: 'uploaded' | 'drawn' | 'typed';
  assetReference?: string;
  drawingReference?: string;
  typedName?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
  typedFontKey?: string;
  drawingData?: any;
  signatureAssetId?: string;
  sourceImageFilename?: string;
  extractionVersion?: string;
}

export interface ReportSignatureRecord {
  id: string;
  reportId: string;
  componentId?: string;
  componentKey?: string;
  signedByUserId: string;
  signedByName: string;
  signedByRole: string;
  signatureRole: 'sender' | 'receiver';
  signatureMethod: 'uploaded' | 'drawn' | 'typed';
  typedName?: string;
  signatureDataUrl?: string;
  verificationId: string;
  confirmationStatement?: string;
  signedContentHash?: string;
  isActive: boolean;
  signedAt: string;
}

export interface SignatureConfig {
  signatureRole?: 'Sender' | 'Receiver';
  label?: string;
  showName?: boolean;
  showRole?: boolean;
  showDate?: boolean;
  showSignatureImage?: boolean;
  captureSignerName?: boolean;
  captureTimestamp?: boolean;
  confirmationStatement?: string;
  signatureType?: 'typed_name' | 'checkbox_confirmation' | 'drawn';
  required?: boolean;
}

export interface KPIConfig {
  format?: 'number' | 'currency' | 'percentage';
  valueType?: 'number' | 'currency' | 'percentage';
  staticValue?: string | number;
  prefix?: string;
  suffix?: string;
  decimalPlaces?: number;
  targetValue?: string | number;
  helperText?: string;
  trend?: 'up' | 'down' | 'neutral';
  displayPreset?: 'standard' | 'compact' | 'highlight';
  alignment?: 'left' | 'center';
}

export interface TemplateComponent {
  id: string;
  type: TemplateComponentType;
  key: string;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: unknown;
  options?: Array<string | ComponentOption>;
  validation?: ComponentValidation;
  layoutWidth?: ComponentLayoutWidth;
  layout?: {
    width?: ComponentLayoutWidth;
  };
  order: number;
  section?: string;

  // Freedom Pack Properties
  size?: "small" | "medium" | "large";
  alignment?: "left" | "center" | "right";
  stylePreset?: "info" | "warning" | "success" | "neutral" | "important";
  assetId?: string;
  assetUrl?: string;
  caption?: string;
  altText?: string;
  columns?: TableColumnConfig[];
  minRows?: number;
  maxRows?: number;
  allowAddRow?: boolean;
  allowDeleteRow?: boolean;
  allowReorderRows?: boolean;
  showRowNumbers?: boolean;
  showFooter?: boolean;
  aggregates?: TableAggregateConfig[];
  tableConfig?: TableConfig;
  repeatingGroupConfig?: RepeatingGroupConfig;
  signatureConfig?: SignatureConfig;
  ratingConfig?: RatingConfig;
  acknowledgementConfig?: AcknowledgementConfig;
  fileConfig?: FileAttachmentConfig;
  headingConfig?: HeadingConfig;
  paragraphConfig?: ParagraphConfig;
  dividerConfig?: DividerConfig;
  spacerConfig?: SpacerConfig;
  imageConfig?: ImageConfig;
  infoBoxConfig?: InfoBoxConfig;
  nestedComponents?: TemplateComponent[];
  kpiConfig?: KPIConfig;
}

export interface TemplateSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  components: TemplateComponent[];
}

export interface ReportTemplateField {
  id: string;
  key?: string;
  label: string;
  type: TemplateComponentType;
  required?: boolean;
  placeholder?: string;
  description?: string;
  defaultValue?: unknown;
  options?: Array<string | ComponentOption>;
  section?: string;
  validation?: ComponentValidation;
  layoutWidth?: ComponentLayoutWidth;
  order?: number;

  // Freedom Pack properties
  size?: "small" | "medium" | "large";
  alignment?: "left" | "center" | "right";
  stylePreset?: "info" | "warning" | "success" | "neutral";
  assetId?: string;
  assetUrl?: string;
  caption?: string;
  altText?: string;
  columns?: TableColumnConfig[];
  minRows?: number;
  maxRows?: number;
  tableConfig?: TableConfig;
  repeatingGroupConfig?: RepeatingGroupConfig;
  signatureConfig?: SignatureConfig;
  headingConfig?: HeadingConfig;
  paragraphConfig?: ParagraphConfig;
  dividerConfig?: DividerConfig;
  spacerConfig?: SpacerConfig;
  imageConfig?: ImageConfig;
  infoBoxConfig?: InfoBoxConfig;
  nestedComponents?: TemplateComponent[];
  kpiConfig?: KPIConfig;
}

export interface DynamicTemplate {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  version: number | string;
  status: TemplateStatus;
  sections: TemplateSection[];
  components?: TemplateComponent[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TypographyToken {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  fontColor: string;
  lineHeight?: string;
}

export interface FormStyleTokens {
  borderRadius: 'square' | 'small' | 'medium' | 'rounded';
  density: 'compact' | 'standard' | 'comfortable';
  fieldBg: string;
  borderColor: string;
}

export interface TableStyleTokens {
  headerBg: string;
  headerTextColor: string;
  borderColor: string;
  density: 'compact' | 'standard' | 'comfortable';
}

export interface DocumentSpacingTokens {
  sectionGap: 'compact' | 'standard' | 'spacious';
  componentGap: 'compact' | 'standard' | 'spacious';
  pagePadding: 'compact' | 'standard' | 'spacious';
}

export interface TemplateTheme {
  preset: "clean" | "corporate" | "executive" | "minimal";
  accent: "indigo" | "emerald" | "amber" | "slate" | "rose" | "blue";
  density: "comfortable" | "compact";
  pageStyle: "plain" | "card";

  name?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  textPrimaryColor?: string;
  textSecondaryColor?: string;
  textMutedColor?: string;
  bgColor?: string;
  surfaceColor?: string;
  borderColor?: string;
  infoColor?: string;
  successColor?: string;
  warningColor?: string;
  dangerColor?: string;
  bodyFont?: string;
  headingFont?: string;
  typography?: {
    h1?: TypographyToken;
    h2?: TypographyToken;
    h3?: TypographyToken;
    body?: TypographyToken;
    label?: TypographyToken;
    caption?: TypographyToken;
  };
  formStyles?: FormStyleTokens;
  tableStyles?: TableStyleTokens;
  documentSpacing?: DocumentSpacingTokens;
}

export type ContentPackCategory =
  | 'General'
  | 'People / HR'
  | 'Finance'
  | 'Operations'
  | 'Technology'
  | 'Project Management'
  | 'Compliance / Risk';

export interface ContentPack {
  id: string;
  ownerUserId?: string | null;
  sourceType: 'system' | 'user';
  name: string;
  normalizedName: string;
  category: ContentPackCategory;
  description: string;
  iconName?: string;
  sections: Array<{
    title: string;
    description?: string;
    components: TemplateComponent[];
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface HeaderConfig {
  title?: string;
  subtitle?: string;
  companyLogoAssetId?: string;
  metadataLine?: string;
  showLogo?: boolean;
}

export interface FooterConfig {
  text?: string;
  confidentialityLabel?: string;
  showPageNumbers?: boolean;
}

export interface WidgetTemplate {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  createdById: string;
  createdByName: string;
  createdByRole: Role;
  createdAt: string;
  updatedAt: string;
  status: TemplateStatus;
  tags: string[];
  version?: string | number;
  creationMethod?: 'blank' | 'template' | 'import';
  layoutType?: WidgetLayoutType;
  sections?: string[];
  dynamicSections?: TemplateSection[];
  fields?: ReportTemplateField[];
  components?: TemplateComponent[];
  requestedApprovalFromUserId?: string;
  requestedApprovalFromName?: string;
  rejectionReason?: string;
  theme?: TemplateTheme;
  headerConfig?: HeaderConfig;
  footerConfig?: FooterConfig;
  workflow?: any;
  config?: {
    type?: string;
    refreshInterval?: string;
    dataSource?: string;
    columns?: number;
  };
}

export interface DigitalSignature {
  id: string;
  reportId: string;
  signedByUserId: string;
  signedByName: string;
  signedByRole: Role;
  signedAt: string;
  verificationId: string;
}

export interface ReportComment {
  id: string;
  reportId: string;
  userId: string;
  userName: string;
  role: Role;
  userAvatar: string;
  message: string;
  createdAt: string;
}

export interface ReportAuditRecord {
  id: string;
  reportId: string;
  personName: string;
  role: Role;
  action: "Created" | "Saved Draft" | "Completed" | "Sent" | "Commented" | "Returned" | "Resent" | "Signed" | "Rejected";
  timestamp: string;
  comment?: string;
}

export interface ReportInstance {
  id: string;
  templateId: string;
  templateName: string;
  templateVersion?: string | number;
  templateVersionId?: string;
  title: string;
  categoryId: string;
  categoryName: string;
  createdById: string;
  createdByName: string;
  createdByRole: Role;
  sentToId?: string;
  sentToName?: string;
  assignments?: ReportAssignment[];
  signatureAssignments?: ReportSignatureAssignment[];
  currentSendCycleId?: string;
  lockedAt?: string;
  sentAt?: string;
  senderNote?: string;
  status: ReportStatus;
  returnReason?: string;
  returnedAt?: string;
  rejectionReason?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;
  data: Record<string, any>;
  values?: Record<string, any>;
  signature?: DigitalSignature;
  activeSignatures?: ReportSignatureRecord[];
  signatureHistory?: ReportSignatureRecord[];
  templateSnapshot?: any;
  auditHistory?: ReportAuditRecord[];
  workflowDetails?: any;
}

export interface ReportSignatureAssignment {
  id: string;
  reportId: string;
  sendCycleId: string;
  reportAssignmentId: string;
  recipientUserId: string;
  signatureFieldKey: string;
  signatureFieldLabelSnapshot?: string;
}

export interface ReportAssignment {
  id: string;
  sendCycleId?: string;
  recipientUserId: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientRoleId?: string;
  recipientRoleKey?: string;
  recipientRoleName?: string;
  recipientGovernanceLevel?: string;
  assignmentStatus?: string;
  assignmentSequence?: number;
}

export type Report = ReportInstance;

export interface ApprovalRecord {
  id: string;
  templateId: string;
  templateName: string;
  personName: string;
  role: Role;
  action: "Submitted" | "Approved" | "Rejected" | "Created" | "Published" | "Commented";
  timestamp: string;
  comment?: string;
}

export interface RequestComment {
  id: string;
  requestId?: string;
  templateId?: string;
  userId: string;
  userName: string;
  userRole: string;
  userAvatar?: string;
  message: string;
  timestamp: string;
}

export interface ImportIssue {
  severity: 'info' | 'warning';
  message: string;
  fieldKey?: string;
}

export interface ImportProposal {
  creationMethod: 'import';
  sourceFilename: string;
  sourceType: 'docx' | 'xlsx' | 'json';
  summary: {
    sectionCount: number;
    fieldCount: number;
    tableCount: number;
    confidence: 'High' | 'Medium' | 'Needs Review';
  };
  issues: ImportIssue[];
  template: Partial<WidgetTemplate>;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "approval_required" | "template_approved" | "template_rejected" | "comment_added" | "report_received" | "report_returned" | "report_signed" | "report_fully_signed" | "report_rejected";
  read: boolean;
  timestamp: string;
  readAt?: string;
  relatedEntityId?: string;
  relatedTemplateId?: string;
  relatedReportId?: string;
  sendCycleId?: string;
  reportAssignmentId?: string;
}

export type ViewType = "dashboard" | "templates" | "my-requests" | "approvals" | "reports" | "notifications" | "engine-proof" | "admin";

export type AdminViewType = "overview" | "data-control" | "features" | "studio-config" | "packs" | "elements" | "content-library" | "users" | "roles" | "categories" | "settings" | "audit";

export interface OrganizationalRole {
  id: string;
  key: string;
  name: string;
  description: string;
  roleType: RoleType;
  governanceLevel: GovernanceLevel;
  isActive: boolean;
  isProtected: boolean;
  assignedUsers: number;
  activeAssignedUsers: number;
  permissions: PermissionKey[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPackItem {
  id: string;
  packId: string;
  sourceType: 'field' | 'element' | 'content';
  sourceKey?: string;
  label: string;
  configuration: Record<string, any>;
  displayOrder: number;
}

export interface AdminPack {
  id: string;
  name: string;
  description: string;
  categoryId?: string;
  categoryName?: string;
  status: 'Draft' | 'Published' | 'Disabled' | 'Archived';
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  items: AdminPackItem[];
  structure?: TemplateSection[];
  publishedVersionId?: string;
  draftVersionId?: string;
  versionLabel?: string;
  draftVersionLabel?: string;
  hasDraft?: boolean;
  publishedStructure?: TemplateSection[];
  draftStructure?: TemplateSection[];
  publishedItems?: AdminPackItem[];
  draftItems?: AdminPackItem[];
}

export interface ContentLibraryItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  contentType: 'Heading' | 'Text Block' | 'Disclaimer' | 'Instruction' | 'Label' | 'Section Intro';
  contentValue: string;
  enabled: boolean;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemFeatureConfig {
  key: string;
  name: string;
  category: string;
  description: string;
  enabled: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

export interface SystemElementConfig {
  key: string;
  name: string;
  category: string;
  description: string;
  enabled: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

export interface SystemGeneralSettings {
  org_name: string;
  platform_name: string;
  default_template_version: string;
  allow_rejection: boolean;
  allow_return: boolean;
  digital_signature: boolean;
  template_governance: boolean;
  [key: string]: any;
}

export interface SystemEffectiveConfig {
  features: Record<string, boolean>;
  elements: Record<string, boolean>;
  settings: SystemGeneralSettings;
  governance?: {
    creatorLevel?: GovernanceLevel;
    strategy?: 'SPECIFIC_USER' | 'ROLE_QUEUE' | 'DIRECT_PUBLISH' | null;
    isDirectPublish?: boolean;
  } | null;
}

export interface AdminAuditRecord {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  target: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
}
