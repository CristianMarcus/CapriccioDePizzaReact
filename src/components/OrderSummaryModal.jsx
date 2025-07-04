import React from 'react';
import { X, ArrowLeft, ArrowRight, ShoppingBag } from 'lucide-react';

const OrderSummaryModal = ({ cartItems, onClose, onBack, onContinue }) => {
  const total = cartItems.reduce((sum, item) => sum + item.precio * item.quantity, 0);

  console.log("OrderSummaryModal: Renderizando. isOrderSummaryModalOpen es TRUE."); // DEBUG
  console.log("OrderSummaryModal: cartItems recibidos:", cartItems); // DEBUG

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto transform scale-95 animate-scale-in">
        <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <ShoppingBag size={28} className="text-orange-600" /> Resumen del Pedido
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full p-1"
            aria-label="Cerrar resumen del pedido"
          >
            <X size={28} />
          </button>
        </div>

        {cartItems.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400 text-lg py-8">No hay productos en tu resumen. Vuelve al carrito.</p>
        ) : (
          <div className="space-y-4 mb-6">
            {cartItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4 last:border-b-0">
                <div className="flex items-center">
                  <img
                    src={item.image || `https://placehold.co/60x60/FF0000/FFFFFF?text=${encodeURIComponent(item.name.substring(0, 2))}`}
                    alt={item.name}
                    className="w-12 h-12 object-cover rounded-lg mr-3 shadow-sm"
                    onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/60x60/FF0000/FFFFFF?text=${encodeURIComponent(item.name.substring(0, 2))}`; }}
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{item.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{item.quantity} x ${Math.floor(item.precio)}</p>
                  </div>
                </div>
                <span className="font-bold text-gray-900 dark:text-gray-100 text-xl">${Math.floor(item.precio * item.quantity)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700 mb-6">
          <span className="text-xl font-bold text-gray-900 dark:text-gray-100">Total Final:</span>
          <span className="text-3xl font-extrabold text-red-600 dark:text-red-400">${Math.floor(total)}</span>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6">
          <button
            onClick={onBack}
            className="w-full sm:w-auto bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 font-bold py-3 px-6 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300 flex items-center justify-center gap-2"
          >
            <ArrowLeft size={20} /> Volver al Carrito
          </button>
          <button
            onClick={() => {
              console.log("OrderSummaryModal: Botón 'Continuar al Pedido' presionado. Llamando onContinue."); // DEBUG
              onContinue(); // Llama a la función que abre OrderFormModal
            }}
            disabled={cartItems.length === 0}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continuar al Pedido <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderSummaryModal;
