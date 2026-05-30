'use client';

import React from 'react';
import { Modal, ModalContent, ModalTitle, ModalTrigger } from '@/components/apps/vsql/ui/modal';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/apps/vsql/ui/command';

import { LucideIcon, Search as SearchIcon } from 'lucide-react';
import styles from './search-modal.module.css';

export type CommandItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  icon?: LucideIcon;
  shortcut?: string;
  onSelect?: () => void;
};

type SearchModalProps = {
  children: React.ReactNode;
  data: CommandItem[];
};

export function SearchModal({ children, data }: SearchModalProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>{children}</ModalTrigger>
      <ModalContent className={styles.modalContent}>
        <ModalTitle className={styles.srOnly}>Search</ModalTitle>
        <Command className={styles.command}>
          <CommandInput
            className={styles.input}
            placeholder="Search..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className={styles.list}>
            <CommandEmpty className={styles.empty}>
              <SearchIcon className={styles.emptyIcon} />
              <p className={styles.emptyText}>No commands found for &quot;{query}&quot;</p>
              <Button onClick={() => setQuery('')} variant="ghost">
                Clear search
              </Button>
            </CommandEmpty>
            <CommandGroup>
              {data.map((item, i) => {
                return (
                  <CommandItem
                    key={i}
                    className={styles.item}
                    value={item.title}
                    onSelect={() => {
                      item.onSelect?.();
                      setOpen(false);
                    }}
                  >
                    {item.icon && <item.icon className={styles.itemIcon} />}
                    <div className={styles.itemContent}>
                      <p className={styles.itemTitle}>{item.title}</p>
                      <p className={styles.itemDescription}>{item.description}</p>
                    </div>
                    <p className={styles.itemCategory}>{item.category}</p>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </ModalContent>
    </Modal>
  );
}
