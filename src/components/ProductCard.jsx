import React, { useState, useCallback } from 'react';
import { ShoppingCart, ImageOff, Plus, Minus, Heart, Star } from 'lucide-react'; // Importamos Star

// Componente funcional ProductCard: Muestra una tarjeta individual de producto.
// Props:
// - producto: Objeto con los datos del producto (id, name, precio, descripcion, image, reviews, stock).
// - onAddToCart: Función para añadir el producto al carrito.
// - onOpenDetails: Función para abrir el modal de detalles del producto.
// - isFavorite: Booleano que indica si el producto es favorito.
// - onToggleFavorite: Nueva función para añadir/quitar de favoritos.
const ProductCard = React.memo(({ producto, onAddToCart, onOpenDetails, isFavorite, onToggleFavorite }) => {
  // Aseguramos que precio y stock sean números válidos
  const displayPrecio = typeof producto.precio === 'number' ? Math.floor(producto.precio) : 'N/A';
  const currentStock = typeof producto.stock === 'number' ? producto.stock : 0;
  const isProductOutOfStock = currentStock <= 0;

  // Estado local para la cantidad del producto a añadir al carrito
  // Inicializa la cantidad en 1, pero no más que el stock disponible si no está agotado
  const [quantity, setQuantity] = useState(isProductOutOfStock ? 0 : 1); 

  // Manejador para incrementar la cantidad, asegurando que no exceda el stock
  const handleIncreaseQuantity = useCallback(() => {
    setQuantity(prevQuantity => Math.min(prevQuantity + 1, currentStock));
  }, [currentStock]);

  // Manejador para decrementar la cantidad, asegurando que no baje de 1
  const handleDecreaseQuantity = useCallback(() => {
    setQuantity(prevQuantity => (prevQuantity > 1 ? prevQuantity - 1 : 1));
  }, []);

  // Manejador para cambiar la cantidad desde el input, validando que sea un número positivo y no exceda el stock
  const handleQuantityChange = useCallback((e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1) {
      setQuantity(Math.min(value, currentStock)); // Limita la cantidad al stock
    } else if (e.target.value === '') { // Permite vaciar el input temporalmente
      setQuantity('');
    }
  }, [currentStock]);

  // Manejador para el blur del input, asegura que la cantidad sea al menos 1 y no exceda el stock
  const handleQuantityBlur = useCallback(() => {
    if (quantity === '' || isNaN(quantity) || quantity < 1) {
      setQuantity(1);
    } else if (quantity > currentStock) {
      setQuantity(currentStock); // Ajusta la cantidad si excede el stock al salir del foco
    }
  }, [quantity, currentStock]);

  // Calcular el promedio de las calificaciones de reseñas aprobadas (si existen)
  const averageRating = producto.reviews && producto.reviews.length > 0
    ? (producto.reviews.filter(r => r.status === 'approved').reduce((sum, review) => sum + (review.rating || 0), 0) / producto.reviews.filter(r => r.status === 'approved').length)
    : 0;

  return (
    // Contenedor principal de la tarjeta. Haz clic en la tarjeta para abrir los detalles.
    // Usamos role="button" y tabIndex para accesibilidad, ya que es clicable.
    <div
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 border border-gray-100 dark:border-gray-700 flex flex-col h-full overflow-hidden cursor-pointer"
      onClick={() => onOpenDetails(producto)} // Abre el modal de detalles al hacer clic en la tarjeta
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { // Para accesibilidad con teclado (Enter o Space)
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault(); // Evita el scroll predeterminado con Space
          onOpenDetails(producto);
        }
      }}
    >
      {/* Botón de Favorito en la esquina superior derecha */}
      <button
        onClick={(e) => {
          e.stopPropagation(); // Evita que el clic en el corazón abra el modal de detalles de la tarjeta
          onToggleFavorite(producto.id);
        }}
        className="absolute top-3 right-3 p-2 rounded-full bg-white dark:bg-gray-700 shadow-md transition-colors duration-200 z-10 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-300"
        aria-label={isFavorite ? "Remover de favoritos" : "Añadir a favoritos"}
      >
        <Heart
          size={20}
          className={isFavorite ? "text-red-500 fill-current" : "text-gray-400 dark:text-gray-300"}
        />
      </button>

      {/* Sección de la imagen del producto */}
      <div className="relative h-48 bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-700 dark:to-gray-800 flex justify-center items-center rounded-t-2xl overflow-hidden">
        {producto.image ? (
          <img
            src={producto.image}
            alt={producto.name}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
            onError={(e) => {
              // Fallback en caso de error al cargar la imagen, manteniendo el placeholder
              e.target.src = "https://placehold.co/400x300/cccccc/ffffff?text=Imagen+No+Disponible";
              e.target.alt = "Imagen no disponible";
              console.error(`ProductCard: Error al cargar imagen para '${producto.name}'. URL original: '${producto.image}'`);
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-300 p-4">
            <ImageOff size={48} className="mb-2" />
            <span className="text-sm text-center">Imagen no disponible</span>
          </div>
        )}
      </div>

      {/* Sección del contenido de texto de la tarjeta */}
      <div className="p-5 flex flex-col flex-grow">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2 line-clamp-2">
          {producto.name}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-3 flex-grow">
          {producto.descripcion}
        </p>
        
        {/* Sección de calificación por estrellas */}
        {averageRating > 0 && ( // Mostrar solo si hay reseñas aprobadas
          <div className="flex items-center mb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={16}
                className={
                  i < Math.round(averageRating) // Redondear para mostrar estrellas completas
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-300 dark:text-gray-600'
                }
              />
            ))}
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              ({producto.reviews.filter(r => r.status === 'approved').length} reseñas)
            </span>
          </div>
        )}

        <p className="text-2xl font-extrabold text-red-600 dark:text-red-400 mb-2 mt-auto">
          ${displayPrecio} {/* Mostrar precio sin centavos */}
        </p>

        {/* Indicador de Stock (solo "Agotado") */}
        <div className="text-sm mb-4">
          {isProductOutOfStock && (
            <span className="font-semibold text-red-500 dark:text-red-400">Agotado</span>
          )}
          {/* No se muestra la cantidad exacta de stock */}
        </div>

        {/* Controles de cantidad y botón "Agregar al carrito" */}
        {onAddToCart && (
          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center space-x-2 border border-gray-300 dark:border-gray-600 rounded-lg p-1 bg-gray-50 dark:bg-gray-700">
              <button
                onClick={(e) => { e.stopPropagation(); handleDecreaseQuantity(); }} // Detiene la propagación para no abrir el modal
                className="p-1 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-300"
                aria-label="Disminuir cantidad"
                disabled={isProductOutOfStock || quantity <= 1} // Deshabilita si agotado o cantidad es 1
              >
                <Minus size={18} />
              </button>
              <input
                type="number"
                id={`quantity-${producto.id}`}
                name={`quantity-${producto.id}`}
                value={quantity}
                onChange={handleQuantityChange}
                onBlur={handleQuantityBlur}
                onClick={(e) => e.stopPropagation()} // Detiene la propagación para no abrir el modal
                className="w-12 text-center bg-transparent text-gray-900 dark:text-gray-100 font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                min="1"
                max={currentStock} // Limita el input al stock disponible
                aria-label="Cantidad de producto"
                disabled={isProductOutOfStock} // Deshabilita si agotado
              />
              <button
                onClick={(e) => { e.stopPropagation(); handleIncreaseQuantity(); }} // Detiene la propagación
                className="p-1 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-300"
                aria-label="Aumentar cantidad"
                disabled={isProductOutOfStock || quantity >= currentStock} // Deshabilita si agotado o ya en stock máximo
              >
                <Plus size={18} />
              </button>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation(); // Detiene la propagación para no abrir el modal
                onAddToCart(producto, quantity);
                setQuantity(1); // RESTABLECE LA CANTIDAD A 1 DESPUÉS DE AÑADIR AL CARRITO
              }}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-base font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-300 dark:focus:ring-800 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Agregar al carrito"
              disabled={isProductOutOfStock} // Deshabilita si agotado
            >
              <ShoppingCart size={20} />
              {isProductOutOfStock ? 'Agotado' : 'Agregar'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default ProductCard;
