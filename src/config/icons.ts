import {
  CalendarClockIcon,
  CalendarDaysIcon,
  ChartColumnIcon,
  ContactIcon,
  FileLockIcon,
  FlagIcon,
  FolderOpenIcon,
  HandHelpingIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  MailIcon,
  MegaphoneIcon,
  MicVocalIcon,
  NewspaperIcon,
  PenLineIcon,
  PlugIcon,
  ScrollTextIcon,
  SettingsIcon,
  UserCheckIcon,
  UsersIcon,
  VoteIcon,
  WalletIcon,
  WrenchIcon,
  Disc3Icon,
  type LucideIcon,
} from 'lucide-react';
import type { Area, AreaSection, PublicSection } from './navigation';

export const publicSectionIcons: Record<PublicSection, LucideIcon> = {
  news: NewspaperIcon,
  events: CalendarDaysIcon,
  artists: MicVocalIcon,
  professionals: WrenchIcon,
  venues: LandmarkIcon,
  studios: Disc3Icon,
  blogs: PenLineIcon,
};

export const areaSectionIcons: { [A in Area]: Record<AreaSection<A>, LucideIcon> } = {
  member: {
    dashboard: LayoutDashboardIcon,
    meetings: CalendarClockIcon,
    tasks: ListChecksIcon,
    announcements: MegaphoneIcon,
    polls: VoteIcon,
    volunteer: HandHelpingIcon,
    documents: FolderOpenIcon,
    directory: ContactIcon,
  },
  board: {
    overview: LayoutDashboardIcon,
    tasks: ListChecksIcon,
    meetings: CalendarClockIcon,
    announcements: MegaphoneIcon,
    polls: VoteIcon,
    volunteering: HandHelpingIcon,
    news: NewspaperIcon,
    events: CalendarDaysIcon,
    finance: WalletIcon,
    vault: FileLockIcon,
    correspondence: MailIcon,
  },
  admin: {
    overview: ChartColumnIcon,
    users: UsersIcon,
    approvals: UserCheckIcon,
    moderation: FlagIcon,
    audit: ScrollTextIcon,
    settings: SettingsIcon,
    integrations: PlugIcon,
  },
};

export function areaSectionIcon<A extends Area>(area: A, section: AreaSection<A>): LucideIcon {
  return (areaSectionIcons[area] as Record<AreaSection<A>, LucideIcon>)[section];
}
