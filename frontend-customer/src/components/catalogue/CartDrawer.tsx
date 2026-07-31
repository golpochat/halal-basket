import { useNavigate } from 'react-router-dom';
import {
  Button,
  Modal,
  UtilityIcons,
  CartWithCountIcon,
  ICON_SIZES,
  useCartStore,
  useToastStore,
} from '@halal-basket/web';
import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useLocale } from '../../locale/LocaleContext';

export function CartDrawer() {
  const { session } = useAuth();
  const { formatMoney } = useLocale();
  const toast = useToastStore((s) => s.toast);
  const navigate = useNavigate();
  const lines = useCartStore((s) => s.lines);
  const count = useCartStore((s) =>
    s.lines.reduce((a, l) => a + l.quantity, 0),
  );
  const total = useCartStore((s) =>
    s.lines.reduce((a, l) => a + l.price * l.quantity, 0),
  );
  const shopId = useCartStore((s) => s.shopId);
  const cartOpen = useCartStore((s) => s.cartOpen);
  const setCartOpen = useCartStore((s) => s.setCartOpen);
  const setQty = useCartStore((s) => s.setQty);
  const clear = useCartStore((s) => s.clear);
  const [confirmClear, setConfirmClear] = useState(false);

  function goCheckout() {
    const items = lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      name: l.name,
    }));
    sessionStorage.setItem(
      'hb_checkout',
      JSON.stringify({ shopId, items }),
    );
    setCartOpen(false);
    if (!session) {
      navigate('/login?next=/checkout');
      return;
    }
    if (session.user.role !== 'customer') {
      toast('Please sign in with a customer account to order', 'error');
      return;
    }
    navigate('/checkout');
  }

  return (
    <>
      {/* Desktop floating basket tab */}
      <button
        type="button"
        className="fixed right-0 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-2 rounded-l-2xl bg-[var(--hb-green)] px-3 py-4 text-white shadow-[var(--hb-shadow-lg)] transition hover:bg-[var(--hb-green-hover)] sm:flex"
        onClick={() => setCartOpen(true)}
        aria-label={`Open cart, ${count} items, ${formatMoney(total)}`}
      >
        <CartWithCountIcon count={count} size={ICON_SIZES.lg} />
        <span className="text-sm font-semibold tabular-nums">
          {formatMoney(total)}
        </span>
      </button>

      {/* Mobile floating bar */}
      <button
        type="button"
        className="fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-[var(--hb-radius-lg)] bg-[var(--hb-green)] px-4 py-3 text-white shadow-[var(--hb-shadow-lg)] sm:hidden"
        onClick={() => setCartOpen(true)}
        aria-label={`Open cart, ${count} items, ${formatMoney(total)}`}
      >
        {UtilityIcons.cart({ size: 20 })}
        <span className="font-semibold">{count} items</span>
        <span>{formatMoney(total)}</span>
        <span className="font-semibold">View</span>
      </button>

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/30 p-0 sm:items-stretch sm:p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close cart"
            onClick={() => setCartOpen(false)}
          />
          <aside className="relative z-10 flex h-[min(92dvh,100%)] w-full max-w-md flex-col rounded-t-[var(--hb-radius-xl)] bg-[var(--hb-cream)] shadow-[var(--hb-shadow-lg)] sm:h-full sm:rounded-[var(--hb-radius-xl)]">
            <div className="flex items-center justify-between border-b border-[rgba(26,92,58,0.1)] px-5 py-4">
              <h2 className="font-display text-xl font-semibold">Your cart</h2>
              <div className="flex gap-2">
                {lines.length > 0 && (
                  <Button
                    variant="tertiary"
                    size="sm"
                    onClick={() => setConfirmClear(true)}
                  >
                    Clear
                  </Button>
                )}
                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={() => setCartOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {lines.length === 0 && (
                <p className="text-sm text-[var(--hb-ink)]/55">
                  Your basket is empty. Add something delicious.
                </p>
              )}
              {lines.map((l) => (
                <div
                  key={l.productId}
                  className="flex items-center justify-between gap-3 rounded-[var(--hb-radius-lg)] bg-white/80 p-3"
                >
                  <div>
                    <p className="font-medium">{l.name}</p>
                    <p className="text-sm text-[var(--hb-ink)]/55">
                      {formatMoney(l.price)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="tertiary"
                      size="sm"
                      onClick={() => setQty(l.productId, l.quantity - 1)}
                    >
                      −
                    </Button>
                    <span className="w-6 text-center">{l.quantity}</span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setQty(l.productId, l.quantity + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[rgba(26,92,58,0.1)] px-5 py-4">
              <div className="mb-3 flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatMoney(total)}</span>
              </div>
              <Button
                variant="primary"
                className="w-full py-3"
                disabled={count === 0}
                onClick={goCheckout}
              >
                Checkout
              </Button>
            </div>
          </aside>
        </div>
      )}

      <Modal
        open={confirmClear}
        title="Clear cart?"
        onClose={() => setConfirmClear(false)}
        footer={
          <div className="flex gap-2">
            <Button
              variant="tertiary"
              className="flex-1"
              onClick={() => setConfirmClear(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => {
                clear();
                setConfirmClear(false);
                toast('Cart cleared');
              }}
            >
              Clear cart
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--hb-ink)]/70">
          This removes all items from your basket.
        </p>
      </Modal>
    </>
  );
}
