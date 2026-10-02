// @/components/ui/index.ts
// Barrel for the primitives only. Feature folders (quiz/, skills/, …) are
// imported by their full path — a barrel over those would invite cycles.

export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';
export { Card } from './Card';
export type { CardProps } from './Card';
export { Modal } from './Modal';
export type { ModalProps } from './Modal';
export { Tag } from './Tag';
export type { TagProps, TagVariant, TagSize } from './Tag';

export { Spinner } from './Spinner';
export type { SpinnerProps } from './Spinner';
export { CountBadge } from './CountBadge';
export type { CountBadgeProps, CountBadgeVariant, CountBadgeSize } from './CountBadge';
export { PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';
export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';
export { TextField } from './TextField';
export type { TextFieldProps } from './TextField';
export { SelectField } from './SelectField';
export type { SelectFieldProps, SelectOption } from './SelectField';
export { Toast, ToastStack } from './Toast';
export type { ToastProps, ToastType } from './Toast';
export { Confetti } from './Confetti';
export type { ConfettiProps } from './Confetti';

// The shared class strings, for feature components that need to match the
// primitives without wrapping one (see ./styles).
export * from './styles';
