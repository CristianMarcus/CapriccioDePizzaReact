import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, X, Star, Heart } from 'lucide-react';
import ReviewForm from './ReviewForm';
import ReviewSection from './ReviewSection';

// Importaciones de Firestore
import { collection, query, where, addDoc, getDocs } from 'firebase/firestore';


function ProductDetailsModal({
  product,
  onClose,
  onAddToCart,
  isFavorite,
  onToggleFavorite,
  db, // Instancia de Firestore
  userId, // ID del usuario actual
  appId, // ID de la aplicación para la ruta de Firestore
  showNotification, // Función para notificaciones
}) {
  // Aseguramos que el stock sea un número válido, por defecto 0 si no está definido
  const currentStock = typeof product.stock === 'number' ? product.stock : 0;
  const isProductOutOfStock = currentStock <= 0;

  // Inicializa la cantidad en 1, pero no más que el stock disponible si no está agotado
  const initialQuantity = isProductOutOfStock ? 0 : 1;
  const [quantity, setQuantity] = useState(initialQuantity);

  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [reviewError, setReviewError] = useState(null);

  const productPrice = product.precio || 0;
  const imageUrl = product.image || product.imagen || 'https://placehold.co/400x300/e0e0e0/000000?text=Sin+Imagen';


  // --- Lógica para cargar reseñas de Firestore ---
  const fetchReviews = useCallback(async () => {
    if (!db || !product?.id) {
      console.warn("ProductDetailsModal: Firestore DB no disponible o Product ID no definido. No se pueden cargar reseñas.");
      setLoadingReviews(false);
      return;
    }

    setLoadingReviews(true);
    setReviewError(null);
    try {
      const reviewsCollectionRef = collection(db, `artifacts/${appId}/public/data/reviews`);
      const q = query(reviewsCollectionRef, where("productId", "==", product.id));
      const querySnapshot = await getDocs(q);
      
      let fetchedReviews = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // ORDENAR RESEÑAS EN EL CLIENTE por el nuevo campo 'createdAt'
      fetchedReviews.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0); // Usa 0 para fechas no válidas, las pondrá al principio
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA; // Orden descendente (más recientes primero)
      });

      // Filtra reseñas que tengan un estado que no sea 'rejected' para mostrar solo las relevantes al usuario
      const filteredReviews = fetchedReviews.filter(review => review.status !== 'rejected');
      setReviews(filteredReviews);
      console.log(`ProductDetailsModal: Reseñas cargadas y filtradas para ${product.name}:`, filteredReviews);
    } catch (err) {
      console.error("ProductDetailsModal: Error al cargar reseñas:", err);
      setReviewError("Error al cargar las reseñas. Inténtalo de nuevo más tarde.");
    } finally {
      setLoadingReviews(false);
    }
  }, [db, product, appId]);

  useEffect(() => {
    if (product) {
      fetchReviews();
      // Reset quantity to 1 (or 0 if out of stock) when product changes
      setQuantity(isProductOutOfStock ? 0 : 1);
    }
  }, [product, fetchReviews, isProductOutOfStock]); // Añadir isProductOutOfStock como dependencia

  // --- Lógica para enviar una nueva reseña a Firestore ---
  const handleReviewSubmit = useCallback(async ({ rating, comment }) => {
    if (!db || !userId || !product?.id) {
      showNotification('Error: No se pudo enviar la reseña. Autenticación o producto no disponibles.', 'error');
      console.error("handleReviewSubmit: Fallo pre-envío. db:", !!db, "userId:", !!userId, "product.id:", !!product?.id);
      return;
    }

    try {
      const reviewsCollectionRef = collection(db, `artifacts/${appId}/public/data/reviews`);
      const reviewData = {
        productId: product.id,
        userId: userId, // Usar el userId proporcionado desde App.jsx
        rating: rating,
        comment: comment,
        createdAt: new Date().toISOString(), // Guarda la fecha como string ISO
        status: 'pending', // Estado inicial como 'pending'
      };
      await addDoc(reviewsCollectionRef, reviewData);
      showNotification('¡Reseña enviada con éxito! Estará visible una vez sea aprobada por un administrador.', 'success', 5000);
      fetchReviews(); // Recargar reseñas para mostrar la nueva (aunque esté pendiente, para el usuario que la envió)
    } catch (err) {
      console.error("ProductDetailsModal: Error al enviar reseña (Firestore call failed):", err);
      if (err.code === 'permission-denied') {
        showNotification('Permiso denegado para enviar la reseña. Asegúrate de estar autenticado.', 'error', 7000);
      } else {
        showNotification('Error al enviar la reseña. Inténtalo de nuevo más tarde.', 'error');
      }
    }
  }, [db, userId, product, appId, showNotification, fetchReviews]);


  const handleImageError = useCallback((e) => {
    e.target.onerror = null; // Evita bucles infinitos de error
    e.target.src = 'https://placehold.co/400x300/e0e0e0/000000?text=Sin+Imagen';
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto transform scale-95 animate-scale-in">
        <div className="flex justify-end mb-4">
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full p-1"
            aria-label="Cerrar detalles del producto"
          >
            <X size={28} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-1/2 flex justify-center items-center">
            <img
              src={imageUrl}
              alt={product.name}
              className="rounded-xl w-full h-auto object-cover max-h-80 shadow-md"
              onError={handleImageError}
            />
          </div>
          <div className="md:w-1/2">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{product.name}</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4 text-lg">{product.descripcion}</p>
            <p className="text-4xl font-extrabold text-red-600 dark:text-red-400 mb-2">${productPrice.toFixed(2)}</p>

            {/* Indicador de Stock en el modal de detalles (solo "Agotado") */}
            <div className="text-sm mb-6">
              {isProductOutOfStock && (
                <span className="font-semibold text-red-500 dark:text-red-400">Agotado</span>
              )}
              {/* No se muestra la cantidad exacta de stock */}
            </div>

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                  className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-bold py-2 px-4 rounded-full text-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                  disabled={isProductOutOfStock || quantity <= 1} // Deshabilita si agotado o cantidad es 1
                >
                  −
                </button>
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{quantity}</span>
                <button
                  onClick={() => setQuantity(prev => Math.min(prev + 1, currentStock))} // Limita al stock
                  className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-bold py-2 px-4 rounded-full text-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                  disabled={isProductOutOfStock || quantity >= currentStock} // Deshabilita si agotado o ya en stock máximo
                >
                  +
                </button>
              </div>
              <button
                onClick={() => onToggleFavorite(product.id)}
                className={`p-2 rounded-full transition-colors duration-300 ${
                  isFavorite
                    ? 'bg-red-500 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-600 hover:bg-red-100 hover:text-red-500 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-red-900'
                }`}
                aria-label={isFavorite ? "Remover de favoritos" : "Añadir a favoritos"}
              >
                <Heart size={28} className={isFavorite ? 'fill-current' : ''} />
              </button>
            </div>

            <button
              onClick={() => {
                onAddToCart(product, quantity);
                onClose(); // Cierra el modal después de añadir al carrito
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl text-lg flex items-center justify-center gap-2 shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isProductOutOfStock} // Deshabilita si agotado
            >
              <ShoppingCart size={24} /> {isProductOutOfStock ? 'Agotado' : 'Añadir al Carrito'}
            </button>
          </div>
        </div>

        {/* Sección de Reseñas */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 space-y-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Reseñas y Calificaciones
          </h3>

          {loadingReviews ? (
            <p className="text-center text-gray-600 dark:text-gray-300">Cargando reseñas...</p>
          ) : reviewError ? (
            <p className="text-center text-red-600 dark:text-red-400">{reviewError}</p>
          ) : (
            // Filtrar reseñas para mostrar al usuario final solo las aprobadas
            <ReviewSection reviews={reviews.filter(review => review.status === 'approved')} />
          )}

          {/* Formulario de Reseñas */}
          <ReviewForm onSubmit={handleReviewSubmit} />
        </div>
      </div>
    </div>
  );
}

export default ProductDetailsModal;
