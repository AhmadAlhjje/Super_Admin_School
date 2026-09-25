import { ChevronLeft, ChevronRight, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ActionsMenu, moveItem, ReorderButtons } from '../../ui/controls';
import { Badge } from '../../ui/display';
import { EmptyState } from '../../ui/feedback';

export interface OrderedItem {
  id: string;
  title: string;
  description?: string | null;
  archivedAt: string | null;
}

/**
 * Ordered, navigable list of content children (topics of a teacher, sessions of a topic):
 * reorder (sortOrder), open, edit, archive/restore.
 */
export function OrderedContentList<T extends OrderedItem>({
  items,
  linkTo,
  meta,
  emptyTitle,
  onReorder,
  onEdit,
  onArchive,
  onRestore,
}: {
  items: T[];
  linkTo: (item: T) => string;
  meta: (item: T) => ReactNode;
  emptyTitle: string;
  onReorder: (ids: string[]) => void;
  onEdit: (item: T) => void;
  onArchive: (item: T) => void;
  onRestore: (item: T) => void;
}) {
  const { t, i18n } = useTranslation();
  const Chevron = i18n.dir() === 'rtl' ? ChevronLeft : ChevronRight;
  const active = items.filter((item) => !item.archivedAt);
  if (items.length === 0) return <EmptyState title={emptyTitle} />;

  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id} className={`flex items-center gap-2 px-3 py-3 ${item.archivedAt ? 'opacity-60' : ''}`}>
          {!item.archivedAt ? (
            <ReorderButtons
              index={active.indexOf(item)}
              count={active.length}
              onMove={(from, to) => onReorder(moveItem(active, from, to).map((entry) => entry.id))}
            />
          ) : (
            <span className="w-16" />
          )}
          <Link
            to={linkTo(item)}
            className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1 hover:bg-muted"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-text group-hover:text-primary">{item.title}</p>
              <p className="text-xs text-secondary">{meta(item)}</p>
            </div>
            {item.archivedAt && <Badge>{t('common.archivedBadge')}</Badge>}
            <Chevron className="size-4 text-secondary" aria-hidden />
          </Link>
          <ActionsMenu
            actions={[
              {
                label: t('common.edit'),
                icon: <Pencil className="size-4" />,
                onSelect: () => onEdit(item),
              },
              item.archivedAt
                ? {
                    label: t('common.restore'),
                    icon: <RotateCcw className="size-4" />,
                    onSelect: () => onRestore(item),
                  }
                : {
                    label: t('common.archive'),
                    icon: <Trash2 className="size-4" />,
                    tone: 'danger',
                    onSelect: () => onArchive(item),
                  },
            ]}
          />
        </li>
      ))}
    </ul>
  );
}
