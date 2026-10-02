// @/components/ui/icons.ts
// All icon imports come from here, never from react-icons directly — the same
// single-entry-point rule the purchasing app's templateIcons.ts sets. Keeping
// one module means swapping icon sets later touches one file.

import type { IconType } from 'react-icons';

export type { IconType } from 'react-icons';

export {
  FiCheck,
  FiX,
  FiPlus,
  FiTrash2,
  FiArrowRight,
  FiExternalLink,
  FiSearch,
  FiChevronDown,
  FiChevronRight,
  FiLogOut,
  FiAward,
  FiBriefcase,
  FiBookOpen,
  FiShare2,
} from 'react-icons/fi';

export {
  FaCircleCheck,
  FaCircleXmark,
  FaCircleInfo,
  FaTriangleExclamation,
  FaXmark,
} from 'react-icons/fa6';

// Named lookup for components that take an icon by name rather than as a node
// (Button's `icon` prop accepts either).
import { FiCheck, FiPlus, FiArrowRight, FiExternalLink, FiAward, FiShare2, FiLogOut } from 'react-icons/fi';

export const UI_ICONS = {
  check: FiCheck,
  plus: FiPlus,
  arrowRight: FiArrowRight,
  externalLink: FiExternalLink,
  award: FiAward,
  share: FiShare2,
  logout: FiLogOut,
} satisfies Record<string, IconType>;

export type UiIconName = keyof typeof UI_ICONS;
