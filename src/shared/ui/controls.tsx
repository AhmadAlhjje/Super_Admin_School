import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { ArrowDown, ArrowUp, MoreVertical, Search } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/cn';
import { IconButton } from './button';

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  label,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-success' : 'bg-border',
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'block size-5 rounded-full bg-white shadow transition-transform',
          checked ? 'ltr:translate-x-5 rtl:-translate-x-5' : 'ltr:translate-x-0.5 rtl:-translate-x-0.5',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export function Tabs({
  value,
  onValueChange,
  tabs,
}: {
  value: string;
  onValueChange: (value: string) => void;
  tabs: { value: string; label: string; content: ReactNode }[];
}) {
  return (
    <TabsPrimitive.Root value={value} onValueChange={onValueChange}>
      <TabsPrimitive.List className="mb-5 flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            className="-mb-px border-b-2 border-transparent px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-secondary transition-colors hover:text-text data-[state=active]:border-primary data-[state=active]:text-primary"
          >
            {tab.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {tabs.map((tab) => (
        <TabsPrimitive.Content key={tab.value} value={tab.value} className="focus:outline-none">
          {tab.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}

export interface MenuAction {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  tone?: 'default' | 'danger';
  hidden?: boolean;
}

/** Row "⋮" menu for secondary actions. */
export function ActionsMenu({ actions, label }: { actions: MenuAction[]; label?: string }) {
  const { t, i18n } = useTranslation();
  const visible = actions.filter((action) => !action.hidden);
  if (visible.length === 0) return null;
  return (
    <DropdownMenu.Root dir={i18n.dir()}>
      <DropdownMenu.Trigger asChild>
        <IconButton label={label ?? t('common.actions')}>
          <MoreVertical className="size-4" />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-44 rounded-lg border border-border bg-surface p-1 shadow-lg"
        >
          {visible.map((action) => (
            <DropdownMenu.Item
              key={action.label}
              onSelect={action.onSelect}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-muted',
                action.tone === 'danger' ? 'text-danger' : 'text-text',
              )}
            >
              {action.icon}
              {action.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** Search box that reports its value after the user stops typing. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  delay = 350,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  delay?: number;
}) {
  const [draft, setDraft] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);
  // The value can change from outside (e.g. back navigation): adopt it during render.
  if (value !== syncedValue) {
    setSyncedValue(value);
    setDraft(value);
  }
  useEffect(() => {
    if (draft === value) return;
    const timer = setTimeout(() => onChange(draft.trim()), delay);
    return () => clearTimeout(timer);
  }, [draft, value, onChange, delay]);
  return (
    <div className="relative w-full sm:w-72">
      <Search
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-secondary"
        aria-hidden
      />
      <input
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-full rounded-lg border border-border bg-surface ps-9 pe-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

/** Up/down buttons for reordering lists (keyboard and screen-reader friendly). */
export function ReorderButtons({
  index,
  count,
  onMove,
  disabled,
}: {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex">
      <IconButton
        label={t('common.moveUp')}
        disabled={disabled || index === 0}
        onClick={() => onMove(index, index - 1)}
      >
        <ArrowUp className="size-4" />
      </IconButton>
      <IconButton
        label={t('common.moveDown')}
        disabled={disabled || index === count - 1}
        onClick={() => onMove(index, index + 1)}
      >
        <ArrowDown className="size-4" />
      </IconButton>
    </span>
  );
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (moved !== undefined) next.splice(to, 0, moved);
  return next;
}
