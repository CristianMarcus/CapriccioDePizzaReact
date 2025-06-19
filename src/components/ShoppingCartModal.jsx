import React, { useCallback } from 'react';
import { X, ShoppingCart, MinusCircle, PlusCircle, Trash2, ChevronRight, FileText, ShoppingBag } from 'lucide-react';

function ShoppingCartModal({
  cartItems,
  onClose,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onRemoveItem,
  onClearCart,
  onContinue,
  onViewSummary,
}) {
  const total = cartItems.reduce((sum, item) => sum + item.precio * item.quantity, 0);

  const handleScrollToBottom = useCallback(() => {
    const modalContent = document.getElementById('shopping-cart-modal-content');
    if (modalContent) {
      modalContent.scrollTo({
        top: modalContent.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);


  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div id="shopping-cart-modal-content" className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto transform scale-95 animate-scale-in">
        <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <ShoppingCart size={32} className="text-red-600" /> Tu Carrito
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full p-1"
            aria-label="Cerrar carrito"
          >
            <X size={28} />
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">Tu carrito está vacío. ¡Añade algunos productos!</p>
            <button
              onClick={onClose}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl text-lg shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300"
            >
              Ir de compras
            </button>
          </div>
        ) : (
          <div>
            <div className="space-y-4 mb-6">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-4 rounded-xl shadow-sm">
                  <img
                    src={item.image || item.imagen || "https://placehold.co/60x60/cccccc/ffffff?text=No+Img"}
                    alt={item.name}
                    className="w-16 h-16 rounded-lg object-cover mr-4 shadow-sm"
                    onError={(e) => e.target.src = "https://placehold.co/60x60/cccccc/ffffff?text=No+Img"}
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{item.name}</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      {/* Mostrar precio del artículo sin centavos */}
                      ${Math.floor(item.precio)} c/u
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 mr-4">
                    <button
                      onClick={() => onDecreaseQuantity(item.id)}
                      className="text-gray-700 dark:text-gray-200 hover:text-red-600 transition-colors duration-200"
                      aria-label={`Disminuir cantidad de ${item.name}`}
                    >
                      <MinusCircle size={24} />
                    </button>
                    <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">{item.quantity}</span>
                    <button
                      onClick={() => onIncreaseQuantity(item.id)}
                      className="text-gray-700 dark:text-gray-200 hover:text-green-600 transition-colors duration-200"
                      aria-label={`Aumentar cantidad de ${item.name}`}
                    >
                      <PlusCircle size={24} />
                    </button>
                  </div>
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="text-red-500 hover:text-red-700 transition-colors duration-200"
                    aria-label={`Eliminar ${item.name} del carrito`}
                  >
                    <Trash2 size={24} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center text-2xl font-bold text-gray-900 dark:text-gray-100 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <span>Total:</span>
              {/* Mostrar total del carrito sin centavos */}
              <span>${Math.floor(total)}</span>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
              {/* NUEVO BOTÓN: Seguir Comprando */}
              <button
                onClick={onClose}
                className="w-full sm:w-auto bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300"
              >
                <ShoppingBag size={20} /> Seguir Comprando
              </button>

              <button
                onClick={onClearCart}
                disabled={cartItems.length === 0}
                className="w-full sm:w-auto bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 font-bold py-3 px-6 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Vaciar Carrito
              </button>
              
              <button
                onClick={() => {
                  console.log("ShoppingCartModal: Botón 'Realizar Pedido' presionado. Llamando onViewSummary."); // **NUEVO DEBUG**
                  if (onViewSummary) {
                    onViewSummary();
                  } else {
                    console.warn("ShoppingCartModal: onViewSummary no está definido, o se esperaba onContinue.");
                    // Fallback a onContinue si onViewSummary no está disponible
                    if (onContinue) onContinue();
                  }
                }}
                disabled={cartItems.length === 0}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText size={20} /> Realizar Pedido
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ShoppingCartModal;
