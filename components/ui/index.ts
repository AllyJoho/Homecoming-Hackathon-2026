// @/components/ui/index.ts
// Barrel for the primitives only. Feature folders (quiz/, skills/, …) are
// imported by their full path — a barrel over those would invite cycles.

export { Button } from './Button';
export type { ButtonProps } from './Button';
export { Card } from './Card';
export type { CardProps } from './Card';
export { Modal } from './Modal';
export type { ModalProps } from './Modal';
export { Tag } from './Tag';
export type { TagProps } from './Tag';
