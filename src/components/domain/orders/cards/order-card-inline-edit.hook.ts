import { useState } from 'react';

export function useOrderInlineEdit() {
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  const startEditing = (orderId: string) => {
    setEditingOrderId(orderId);
  };

  const stopEditing = () => {
    setEditingOrderId(null);
  };

  const isEditing = (orderId: string) => editingOrderId === orderId;

  return {
    editingOrderId,
    startEditing,
    stopEditing,
    isEditing,
  };
}
