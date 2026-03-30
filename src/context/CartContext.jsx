import React, { createContext, useContext, useMemo, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  function add(item) {
    setItems((prev) => [...prev, { ...item, cartId: Date.now() + Math.random() }]);
  }

  function remove(cartId) {
    setItems((prev) => prev.filter((x) => x.cartId !== cartId));
  }

  function clear() {
    setItems([]);
  }

  const total = useMemo(
    () => items.reduce((sum, x) => sum + (Number(x.price) || 0), 0),
    [items]
  );

  const value = useMemo(
    () => ({ items, add, remove, clear, total }),
    [items, total]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
