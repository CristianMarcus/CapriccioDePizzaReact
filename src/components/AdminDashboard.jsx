import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, getDocs, where } from 'firebase/firestore';
import ProductForm from './ProductForm';
import { Edit, Trash2, PlusCircle, ShoppingBag, Box, LogOut, Filter, Home, Star, MessageSquare, BarChart2, DollarSign, ListOrdered, TrendingUp, Eraser, Loader2, Search } from 'lucide-react'; 

const AdminDashboard = ({ db, appId, onLogout, showNotification, onGoToHome, hasShownAdminWelcome, setHasShownAdminWelcome }) => { 
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [mostOrderedProducts, setMostOrderedProducts] = useState([]);
  const [topRevenueProducts, setTopRevenueProducts] = useState([]);   
  
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);
  const [averageOrderValue, setAverageOrderValue] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [clearingOrders, setClearingOrders] = useState(false); 
  const [selectedCategory, setSelectedCategory] = useState('all'); 
  // Nuevo estado para el término de búsqueda de productos
  const [productSearchTerm, setProductSearchTerm] = useState('');

  const [selectedMetricsTimeRange, setSelectedMetricsTimeRange] = useState('all');
  const [selectedOrderListTimeRange, setSelectedOrderListTimeRange] = useState('all');
  const [selectedReviewsTimeRange, setSelectedReviewsTimeRange] = useState('all');

  // Nuevo estado para controlar qué producto está actualizando su stock
  const [updatingStockId, setUpdatingStockId] = useState(null);

  // Nuevo useEffect para mostrar el mensaje de bienvenida al administrador
  useEffect(() => {
    if (hasShownAdminWelcome) {
      showNotification('¡Inicio de sesión de administrador exitoso! ¡Bienvenido!', 'success', 4000);
      setHasShownAdminWelcome(false); 
    }
  }, [hasShownAdminWelcome, showNotification, setHasShownAdminWelcome]);


  // Función de ayuda para calcular la fecha de inicio del filtrado
  const getStartDate = (timeRange) => {
    const now = new Date();
    let startDate = null;

    if (timeRange === '1week') {
      startDate = new Date(now.setDate(now.getDate() - 7));
    } else if (timeRange === '15days') {
      startDate = new Date(now.setDate(now.getDate() - 15));
    } else if (timeRange === '1month') {
      startDate = new Date(now.setMonth(now.getMonth() - 1));
    }
    return startDate ? startDate.toISOString() : null;
  };


  // Función para obtener productos en tiempo real
  const fetchProducts = useCallback(() => {
    if (!db) {
      console.warn("AdminDashboard: Firestore db no está inicializado para productos.");
      setError("No se puede cargar la base de datos de productos.");
      setLoading(false); 
      return () => {}; 
    }

    const productsCollectionRef = collection(db, `artifacts/${appId}/public/data/products`);
    const unsubscribe = onSnapshot(productsCollectionRef, (snapshot) => {
      const productsData = snapshot.docs.map(doc => {
        const { id, ...dataWithoutId } = doc.data();
        return {
          id: doc.id,
          ...dataWithoutId,
        };
      });
      
      setProducts(productsData);
      setLoading(false);
      console.log("Productos cargados en AdminDashboard (Firestore):", productsData.length);
    }, (err) => {
      console.error("Error al obtener productos en tiempo real:", err);
      setError("Error al cargar productos: " + err.message);
      setLoading(false);
    });

    return unsubscribe;
  }, [db, appId]);

  // Función para obtener pedidos para la LISTA (pestaña de pedidos)
  const fetchOrderListData = useCallback(() => {
    if (!db) {
      console.warn("AdminDashboard: Firestore db no está inicializado para la lista de pedidos.");
      setError("No se puede cargar la base de datos de pedidos para la lista.");
      setLoading(false);
      return () => {};
    }

    setLoading(true);
    const ordersCollectionRef = collection(db, `artifacts/${appId}/public/data/orders`);
    let q = query(ordersCollectionRef);

    const startDate = getStartDate(selectedOrderListTimeRange);
    if (startDate) {
      q = query(ordersCollectionRef, where("createdAt", ">=", startDate));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
      console.log(`Pedidos cargados para la lista (filtro '${selectedOrderListTimeRange}'):`, ordersData.length);
      setLoading(false);
    }, (err) => {
      console.error("Error al obtener pedidos en tiempo real para la lista:", err);
      setError("Error al cargar pedidos para la lista: " + err.message);
      setLoading(false);
    });

    return unsubscribe;
  }, [db, appId, selectedOrderListTimeRange]); 

  // Función para obtener pedidos y calcular MÉTRICAS (pestaña de métricas)
  const fetchMetricsData = useCallback(() => {
    if (!db) {
      console.warn("AdminDashboard: Firestore db no está inicializado para métricas.");
      setError("No se puede cargar la base de datos para métricas.");
      return () => {};
    }

    const ordersCollectionRef = collection(db, `artifacts/${appId}/public/data/orders`);
    let q = query(ordersCollectionRef);

    const startDate = getStartDate(selectedMetricsTimeRange);
    if (startDate) {
      q = query(ordersCollectionRef, where("createdAt", ">=", startDate));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log(`Pedidos cargados para métricas (filtro '${selectedMetricsTimeRange}'):`, ordersData.length);

      let currentTotalRevenue = 0;
      let currentTotalOrdersCount = ordersData.length;
      const productSales = {}; // { productId: { quantity: X, revenue: Y, name: Z } }

      ordersData.forEach(order => {
        const orderTotal = typeof order.total === 'number' ? order.total : (order.cartItems ? order.cartItems.reduce((sum, item) => sum + (item.precio * item.quantity || 0), 0) : 0);
        currentTotalRevenue += orderTotal;

        if (order.cartItems && Array.isArray(order.cartItems)) {
          order.cartItems.forEach(item => {
            if (item.id && item.name && typeof item.quantity === 'number' && typeof item.precio === 'number') {
              if (!productSales[item.id]) {
                productSales[item.id] = {
                  name: item.name,
                  totalQuantity: 0,
                  totalRevenue: 0,
                };
              }
              productSales[item.id].totalQuantity += item.quantity;
              productSales[item.id].totalRevenue += item.quantity * item.precio;
            }
          });
        }
      });

      setTotalRevenue(Math.floor(currentTotalRevenue));
      setTotalOrdersCount(currentTotalOrdersCount);
      setAverageOrderValue(currentTotalOrdersCount > 0 ? Math.floor(currentTotalRevenue / currentTotalOrdersCount) : 0);

      const sortedByQuantity = Object.values(productSales).sort((a, b) => b.totalQuantity - a.totalQuantity);
      setMostOrderedProducts(sortedByQuantity);

      const sortedByRevenue = Object.values(productSales).sort((a, b) => b.totalRevenue - a.totalRevenue);
      setTopRevenueProducts(sortedByRevenue);

    }, (err) => {
      console.error("Error al obtener pedidos en tiempo real y calcular métricas:", err);
      setError("Error al cargar pedidos o métricas: " + err.message);
    });

    return unsubscribe;
  }, [db, appId, selectedMetricsTimeRange]); 

  // Función para obtener reseñas en tiempo real
  const fetchReviews = useCallback(() => {
    if (!db) {
      console.warn("AdminDashboard: Firestore db no está inicializado para reseñas.");
      setError("No se puede cargar la base de datos de reseñas.");
      setLoading(false);
      return () => {};
    }

    const reviewsCollectionRef = collection(db, `artifacts/${appId}/public/data/reviews`);
    let q = query(reviewsCollectionRef); 

    const startDate = getStartDate(selectedReviewsTimeRange);
    if (startDate) {
      q = query(reviewsCollectionRef, where("createdAt", ">=", startDate));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data
        };
      });
      setReviews(reviewsData.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : (a.timestamp ? a.timestamp.toDate() : new Date(0));
        const dateB = b.createdAt ? new Date(b.createdAt) : (b.timestamp ? b.timestamp.toDate() : new Date(0));
        return dateB - dateA; 
      })); 
      setLoading(false);
      console.log(`Reseñas cargadas en AdminDashboard (filtro '${selectedReviewsTimeRange}'):`, reviewsData.length);
    }, (err) => {
      console.error("Error al obtener reseñas en tiempo real:", err);
      setError("Error al cargar reseñas: " + err.message);
      setLoading(false);
    });

    return unsubscribe;
  }, [db, appId, selectedReviewsTimeRange]); 


  // Efecto principal para las suscripciones de Firestore
  useEffect(() => {
    const unsubscribeProducts = fetchProducts();
    const unsubscribeOrderList = fetchOrderListData(); 
    const unsubscribeMetrics = fetchMetricsData(); 
    const unsubscribeReviews = fetchReviews(); 

    return () => {
      unsubscribeProducts();
      unsubscribeOrderList();
      unsubscribeMetrics();
      unsubscribeReviews(); 
    };
  }, [fetchProducts, fetchOrderListData, fetchMetricsData, fetchReviews]); 


  // useMemo para mapear IDs de productos a sus nombres
  const productNameMap = useMemo(() => {
    return products.reduce((acc, product) => {
      acc[product.id] = product.name;
      return acc;
    }, {});
  }, [products]);


  // Lógica para filtrar productos por categoría y término de búsqueda
  const uniqueCategories = useMemo(() => {
    const categories = products.map(product => product.category).filter(Boolean);
    return ['all', ...new Set(categories.sort())];
  }, [products]);

  const filteredAndSortedProducts = useMemo(() => {
    let currentProducts = products;

    // Filtrar por categoría
    if (selectedCategory !== 'all') {
      currentProducts = currentProducts.filter(product => product.category === selectedCategory);
    }

    // Filtrar por término de búsqueda (nombre o descripción)
    if (productSearchTerm.trim() !== '') {
      const lowerCaseSearchTerm = productSearchTerm.toLowerCase();
      currentProducts = currentProducts.filter(product =>
        (product.name && product.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (product.descripcion && product.descripcion.toLowerCase().includes(lowerCaseSearchTerm))
      );
    }

    // Ordenar alfabéticamente por nombre
    return currentProducts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [products, selectedCategory, productSearchTerm]);


  // Función para borrar todos los pedidos (y restablecer métricas)
  const handleClearAllOrders = async () => {
    if (!db) {
      showNotification("Error: Firestore no está inicializado.", "error");
      return;
    }

    const confirmed = await new Promise(resolve => {
        const confirmModal = document.createElement('div');
        confirmModal.className = "fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center p-4 z-50";
        confirmModal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm sm:max-w-md">
                <h3 class="text-xl sm:text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Confirmar Eliminación</h3>
                <p class="text-700 dark:text-gray-300 mb-6 text-sm sm:text-base">¿Estás SEGURO de que quieres ELIMINAR TODOS los pedidos? Esta acción es irreversible.</p>
                <div class="flex justify-end space-x-3">
                    <button id="cancelConfirm" class="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-md shadow-sm transition-all duration-200 text-sm sm:text-base">Cancelar</button>
                    <button id="okConfirm" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm transition-all duration-200 text-sm sm:text-base">Eliminar Todo</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmModal);

        document.getElementById('cancelConfirm').onclick = () => {
            confirmModal.remove();
            resolve(false);
        };
        document.getElementById('okConfirm').onclick = () => {
            confirmModal.remove();
            resolve(true);
        };
    });

    if (!confirmed) {
      return;
    }

    setClearingOrders(true);
    showNotification("Vaciando todos los pedidos...", "info");

    try {
      const ordersCollectionRef = collection(db, `artifacts/${appId}/public/data/orders`);
      const q = query(ordersCollectionRef);
      const querySnapshot = await getDocs(q);
      let deletedCount = 0;

      for (const orderDoc of querySnapshot.docs) {
        await deleteDoc(doc(db, `artifacts/${appId}/public/data/orders/${orderDoc.id}`));
        deletedCount++;
      }
      showNotification(`¡Éxito! Se eliminaron ${deletedCount} pedidos.`, "success");
      console.log(`Eliminación masiva completada: ${deletedCount} pedidos eliminados.`);
      
      setTotalRevenue(0);
      setTotalOrdersCount(0);
      setAverageOrderValue(0);
      setMostOrderedProducts([]);
      setTopRevenueProducts([]);

    } catch (err) {
      console.error("Error al borrar pedidos:", err);
      showNotification(`Error al borrar pedidos: ${err.message}`, "error");
    } finally {
      setClearingOrders(false);
    }
  };

  // NUEVA FUNCIÓN: Actualizar stock de un producto directamente
  const handleUpdateProductStock = useCallback(async (productId, newStockValue) => {
    if (!db) {
      showNotification("Error: Firestore no está inicializado.", "error");
      return;
    }
    setUpdatingStockId(productId); // Establece el estado de carga para este producto
    try {
      const productDocRef = doc(db, `artifacts/${appId}/public/data/products/${productId}`);
      // Asegura que newStockValue sea un número entero no negativo
      const stockToUpdate = Math.max(0, parseInt(newStockValue, 10) || 0); 
      await updateDoc(productDocRef, { stock: stockToUpdate });
      showNotification(`Stock de ${productNameMap[productId] || 'producto'} actualizado a ${stockToUpdate}.`, 'success');
    } catch (err) {
      console.error("Error al actualizar stock del producto:", err);
      showNotification(`Error al actualizar stock: ${err.message}`, 'error');
    } finally {
      setUpdatingStockId(null); // Limpia el estado de carga
    }
  }, [db, appId, productNameMap, showNotification]);


  // Funciones de gestión de productos (CRUD individual)
  const handleAddProduct = async (productData) => {
    console.log("AdminDashboard: [handleAddProduct] Recibiendo datos para agregar:", productData);
    if (!db) {
      console.error("AdminDashboard: [handleAddProduct] Firestore db no está inicializado.");
      showNotification('Error: Base de datos no disponible.', 'error');
      return;
    }
    try {
      const productsCollectionRef = collection(db, `artifacts/${appId}/public/data/products`);
      if (!productData) {
        console.error("AdminDashboard: [handleAddProduct] productData es nulo/indefinido. No se puede agregar el documento.");
        showNotification('Error: Datos de producto inválidos.', 'error');
        return;
      }
      const productToSave = { 
        ...productData, 
        precio: typeof productData.precio === 'string' ? parseFloat(productData.precio) : productData.precio,
        stock: typeof productData.stock === 'string' ? parseInt(productData.stock, 10) : productData.stock, // Asegura que stock sea número
        createdAt: new Date().toISOString() 
      };

      const docRef = await addDoc(productsCollectionRef, productToSave);
      console.log("AdminDashboard: [handleAddProduct] Documento agregado con ID:", docRef.id, "Datos:", productToSave);
      showNotification('¡Producto agregado exitosamente!', 'success');
    } catch (err) {
      console.error("AdminDashboard: [handleAddProduct] Error al agregar producto a Firestore:", err);
      showNotification('Error al agregar producto: ' + err.message, 'error');
      throw err;
    }
  };

  const handleUpdateProduct = async (productId, productData) => {
    console.log("AdminDashboard: [handleUpdateProduct] Recibiendo datos para actualizar ID:", productId, "Datos:", productData);
    if (!db) {
      console.error("AdminDashboard: [handleUpdateProduct] Firestore db no está inicializado.");
      showNotification('Error: Base de datos no disponible.', 'error');
      return;
    }
    try {
      const productDocRef = doc(db, `artifacts/${appId}/public/data/products/${productId}`);
      const productToUpdate = { 
        ...productData, 
        precio: typeof productData.precio === 'string' ? parseFloat(productData.precio) : productData.precio,
        stock: typeof productData.stock === 'string' ? parseInt(productData.stock, 10) : productData.stock // Asegura que stock sea número
      };
      await updateDoc(productDocRef, productToUpdate);
      console.log("AdminDashboard: [handleUpdateProduct] Documento actualizado. ID:", productId, "Datos:", productToUpdate);
      showNotification('¡Producto actualizado exitosamente!', 'success');
    } catch (err) {
      console.error("AdminDashboard: [handleUpdateProduct] Error al actualizar producto en Firestore:", err);
      showNotification('Error al actualizar producto: ' + err.message, 'error');
      throw err;
    }
  };

  const handleProductSave = async (id, productData) => {
    try {
      if (id) {
        await handleUpdateProduct(id, productData);
      } else {
        await handleAddProduct(productData);
      }
    } catch (saveError) {
      console.error("AdminDashboard: Error en handleProductSave:", saveError);
    } finally {
      setIsProductModalOpen(false);
      setEditingProduct(null);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!db) {
      showNotification("Error: Firestore no está inicializado.", "error");
      return;
    }
    const confirmed = await new Promise(resolve => {
        const confirmModal = document.createElement('div');
        confirmModal.className = "fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center p-4 z-50";
        confirmModal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm sm:max-w-md">
                <h3 class="text-xl sm:text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Confirmar Eliminación</h3>
                <p class="text-gray-700 dark:text-gray-300 mb-6 text-sm sm:text-base">¿Estás seguro de que quieres eliminar este producto?</p>
                <div class="flex justify-end space-x-3">
                    <button id="cancelConfirm" class="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-md shadow-sm transition-all duration-200 text-sm sm:text-base">Cancelar</button>
                    <button id="okConfirm" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm transition-all duration-200 text-sm sm:text-base">Eliminar</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmModal);

        document.getElementById('cancelConfirm').onclick = () => {
            confirmModal.remove();
            resolve(false);
        };
        document.getElementById('okConfirm').onclick = () => {
            confirmModal.remove();
            resolve(true);
        };
    });

    if (!confirmed) {
      return;
    }

    try {
      const productDocRef = doc(db, `artifacts/${appId}/public/data/products/${productId}`);
      await deleteDoc(productDocRef);
      showNotification('¡Producto eliminado exitosamente!', 'success');
    } catch (err) {
      console.error("Error al eliminar producto:", err);
      showNotification('Error al eliminar producto: ' + err.message, 'error');
    }
  };

  const openProductModal = (product = null) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };


  // Funciones de gestión de pedidos
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    if (!db) {
      showNotification("Error: Firestore no está inicializado.", "error");
      return;
    }
    try {
      const orderDocRef = doc(db, `artifacts/${appId}/public/data/orders/${orderId}`);
      await updateDoc(orderDocRef, { status: newStatus });
      showNotification(`Estado del pedido ${orderId.substring(0, 6)}... actualizado a "${newStatus}"`, 'success');
    } catch (err) {
      console.error("Error al actualizar estado del pedido:", err);
      showNotification('Error al actualizar estado del pedido: ' + err.message, 'error');
    }
  };

  // Funciones de gestión de reseñas
  const handleUpdateReviewStatus = async (reviewId, newStatus) => {
    if (!db) {
      showNotification("Error: Firestore no está inicializado.", "error");
      return;
    }
    console.log(`[handleUpdateReviewStatus] Intentando actualizar reseña ID: ${reviewId} a estado: ${newStatus}`);
    try {
      const reviewDocRef = doc(db, `artifacts/${appId}/public/data/reviews/${reviewId}`);
      await updateDoc(reviewDocRef, { status: newStatus });
      showNotification(`Estado de la reseña ${reviewId.substring(0, 6)}... actualizado a "${newStatus}"`, 'success');
      console.log(`[handleUpdateReviewStatus] Reseña ID: ${reviewId} actualizada exitosamente a estado: ${newStatus}`);
    } catch (err) {
      console.error("[handleUpdateReviewStatus] Error al actualizar estado de la reseña:", err);
      showNotification('Error al actualizar estado de la reseña: ' + err.message, 'error');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!db) {
      showNotification("Error: Firestore no está inicializado.", "error");
      return;
    }
    const confirmed = await new Promise(resolve => {
        const confirmModal = document.createElement('div');
        confirmModal.className = "fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center p-4 z-50";
        confirmModal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm sm:max-w-md">
                <h3 class="text-xl sm:text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Confirmar Eliminación</h3>
                <p class="text-gray-700 dark:text-gray-300 mb-6 text-sm sm:text-base">¿Estás seguro de que quieres eliminar esta reseña?</p>
                <div class="flex justify-end space-x-3">
                    <button id="cancelConfirm" class="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-md shadow-sm transition-all duration-200 text-sm sm:text-base">Cancelar</button>
                    <button id="okConfirm" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm transition-all duration-200 text-sm sm:text-base">Eliminar</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmModal);

        document.getElementById('cancelConfirm').onclick = () => {
            confirmModal.remove();
            resolve(false);
        };
        document.getElementById('okConfirm').onclick = () => {
            confirmModal.remove();
            resolve(true);
        };
    });

    if (!confirmed) {
      return;
    }

    try {
      const reviewDocRef = doc(db, `artifacts/${appId}/public/data/reviews/${reviewId}`);
      await deleteDoc(reviewDocRef);
      showNotification('¡Reseña eliminada exitosamente!', 'success');
    } catch (err) {
      console.error("Error al eliminar reseña:", err);
      showNotification('Error al eliminar reseña: ' + err.message, 'error');
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-xl text-gray-700 dark:text-gray-300">Cargando panel de administrador...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-red-600">
        <p className="text-xl">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 sm:mb-8 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-3xl sm:text-4xl font-bold text-red-700 dark:text-red-400 mb-4 md:mb-0">
            Panel de Administración
          </h2>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
            <button
              onClick={onGoToHome}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 flex items-center justify-center text-sm sm:text-base" 
              aria-label="Ir a la Tienda"
            >
              <Home className="inline-block mr-2" size={20} /> Ir a la Tienda
            </button>
            <button
              onClick={onLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300 flex items-center justify-center text-sm sm:text-base" 
              aria-label="Cerrar Sesión"
            >
              <LogOut className="inline-block mr-2" size={20} /> Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Pestañas de navegación: adaptable a pantallas pequeñas con scroll, AHORA CON BARRA DE SCROLL VISIBLE */}
        <div className="flex mb-8 border-b border-gray-200 dark:border-gray-700 overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-lg font-medium rounded-t-lg transition-colors duration-200 flex items-center gap-1 sm:gap-2 flex-shrink-0
              ${activeTab === 'products'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            <Box size={18} sm:size={20} /> <span className="hidden sm:inline">Gestión de </span>Productos
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-lg font-medium rounded-t-lg transition-colors duration-200 flex items-center gap-1 sm:gap-2 flex-shrink-0
              ${activeTab === 'orders'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            <ShoppingBag size={18} sm:size={20} /> <span className="hidden sm:inline">Gestión de </span>Pedidos
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-lg font-medium rounded-t-lg transition-colors duration-200 flex items-center gap-1 sm:gap-2 flex-shrink-0
              ${activeTab === 'reviews'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            <MessageSquare size={18} sm:size={20} /> <span className="hidden sm:inline">Gestión de </span>Reseñas
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-lg font-medium rounded-t-lg transition-colors duration-200 flex items-center gap-1 sm:gap-2 flex-shrink-0
              ${activeTab === 'metrics'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            <BarChart2 size={18} sm:size={20} /> Métricas
          </button>
        </div>

        {/* Contenido de la pestaña 'products' */}
        {activeTab === 'products' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <h3 className="text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-gray-200 mb-3 sm:mb-0">Productos</h3>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                <button
                  onClick={() => openProductModal()}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300 flex items-center justify-center text-sm sm:text-base"
                >
                  <PlusCircle size={20} /> Añadir Producto
                </button>
              </div>
            </div>

            <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <label htmlFor="category-filter" className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-1 text-sm sm:text-base">
                <Filter size={18} /> Filtrar por Categoría:
              </label>
              <select
                id="category-filter"
                name="categoryFilter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-red-500 focus:border-red-500 text-sm sm:text-base"
              >
                {uniqueCategories.map((category) => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'Todas las Categorías' : category}
                  </option>
                ))}
              </select>

              {/* Input de búsqueda para productos */}
              <div className="relative w-full sm:w-auto flex-grow">
                <input
                  type="text"
                  id="product-search"
                  name="productSearch"
                  placeholder="Buscar producto..."
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  className="w-full p-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-400 focus:ring-red-500 focus:border-red-500 text-sm sm:text-base"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" size={18} />
              </div>
            </div>

            {filteredAndSortedProducts.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-10">
                {selectedCategory === 'all' && productSearchTerm === ''
                  ? "No hay productos para mostrar. Añade uno nuevo."
                  : "No se encontraron productos que coincidan con los filtros aplicados."}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg shadow-md">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Imagen</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nombre</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">Categoría</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Precio</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Stock</th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredAndSortedProducts.map((product) => (
                      <tr key={product.id}>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <img
                            src={product.image || "https://placehold.co/50x50/cccccc/ffffff?text=Sin+Img"}
                            alt={product.name}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover shadow-sm"
                            onError={(e) => e.target.src = "https://placehold.co/50x50/cccccc/ffffff?text=Sin+Img"}
                          />
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {product.name}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 hidden sm:table-cell">
                          {product.category}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          ${Math.floor(typeof product.precio === 'number' ? product.precio : 0)}
                        </td>
                        {/* CAMPO DE STOCK EDITABLE INLINE */}
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              min="0"
                              value={product.stock || 0} // Asegura que sea un número, por defecto 0
                              onChange={(e) => {
                                // Actualización optimista del estado local para feedback inmediato
                                const newProducts = products.map(p =>
                                  p.id === product.id ? { ...p, stock: parseInt(e.target.value, 10) || 0 } : p
                                );
                                setProducts(newProducts);
                              }}
                              onBlur={(e) => handleUpdateProductStock(product.id, parseInt(e.target.value, 10) || 0)}
                              className="w-20 p-1 border rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-red-500 focus:border-red-500 text-sm"
                              disabled={updatingStockId === product.id} // Deshabilita mientras se actualiza
                            />
                            {updatingStockId === product.id && (
                              <Loader2 size={16} className="animate-spin text-blue-500 ml-2 absolute right-2" />
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openProductModal(product)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-600 inline-flex items-center p-1 sm:p-2 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors duration-200"
                            title="Editar Producto"
                          >
                            <Edit size={18} sm:size={20} />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-600 inline-flex items-center p-1 sm:p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900 transition-colors duration-200 ml-1 sm:ml-2"
                            title="Eliminar Producto"
                          >
                            <Trash2 size={18} sm:size={20} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {isProductModalOpen && (
              <ProductForm
                product={editingProduct}
                onClose={closeProductModal}
                onSave={handleProductSave} 
                showNotification={showNotification}
              />
            )}
          </div>
        )}

        {/* Contenido de la pestaña 'orders' */}
        {activeTab === 'orders' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <h3 className="text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-gray-200 mb-3 sm:mb-0">Pedidos</h3>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                <select
                  id="order-list-time-range"
                  name="orderListTimeRange"
                  value={selectedOrderListTimeRange}
                  onChange={(e) => setSelectedOrderListTimeRange(e.target.value)}
                  className="w-full sm:w-auto p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-red-500 focus:border-red-500 text-sm sm:text-base"
                >
                  <option value="all">Todo el Tiempo</option>
                  <option value="1week">Última Semana</option>
                  <option value="15days">Últimos 15 Días</option>
                  <option value="1month">Último Mes</option>
                </select>

                <button
                  onClick={handleClearAllOrders}
                  disabled={clearingOrders} 
                  className="bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300 flex items-center justify-center text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Eraser size={20} />
                  {clearingOrders ? 'Borrando...' : 'Borrar Todos los Pedidos'}
                </button>
              </div>
            </div>

            {orders.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-10">No hay pedidos para mostrar en este rango de tiempo.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg shadow-md">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">Cliente (UID)</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {order.id.substring(0, 8)}...
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 hidden md:table-cell">
                          {order.userId || 'Anónimo'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {order.createdAt ? new Date(order.createdAt).toLocaleString('es-AR') : 'N/A'} {/* Formato de fecha para Argentina */}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          ${Math.floor(order.total || 0)}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm">
                          <select
                            id={`order-status-${order.id}`}
                            name="orderStatus"
                            value={order.status || 'Pendiente'}
                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 text-sm" 
                          >
                            <option value="Pendiente">Pendiente</option>
                            <option value="En preparación">En Preparación</option>
                            <option value="En camino">En Camino</option>
                            <option value="Entregado">Entregado</option>
                            <option value="Cancelado">Cancelado</option>
                          </select>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {/* Aquí podrías añadir un botón para ver detalles del pedido si es necesario */}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Sección de Reseñas */}
        {activeTab === 'reviews' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <h3 className="text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-gray-200 mb-3 sm:mb-0">Reseñas de Productos</h3>
              <select
                id="reviews-time-range"
                name="reviewsTimeRange"
                value={selectedReviewsTimeRange}
                onChange={(e) => setSelectedReviewsTimeRange(e.target.value)}
                className="w-full sm:w-auto p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-red-500 focus:border-red-500 text-sm sm:text-base"
              >
                <option value="all">Todo el Tiempo</option>
                <option value="1week">Última Semana</option>
                <option value="15days">Últimos 15 Días</option>
                <option value="1month">Último Mes</option>
              </select>
            </div>
            {reviews.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-10">No hay reseñas para mostrar en este rango de tiempo.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg shadow-md">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Producto</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">Usuario</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Calificación</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Comentario</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">Fecha</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {reviews.map((review) => {
                      let displayDate = 'N/A';
                      if (review.createdAt) {
                        try {
                          displayDate = new Date(review.createdAt).toLocaleString('es-AR'); // Formato de fecha para Argentina
                        } catch (e) {
                          console.warn("Error al analizar createdAt:", review.createdAt, e);
                        }
                      } else if (review.timestamp && typeof review.timestamp.toDate === 'function') {
                        try {
                          displayDate = review.timestamp.toDate().toLocaleString('es-AR'); // Formato de fecha para Argentina
                        } catch (e) {
                          console.warn("Error al analizar timestamp toDate():", review.timestamp, e);
                        }
                      }
                      
                      const productName = productNameMap[review.productId] || (review.productId ? review.productId.substring(0, 8) + '...' : 'N/A');

                      return (
                        <tr key={review.id}>
                          <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                            {productName}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 hidden md:table-cell">
                            {review.userName || review.userId?.substring(0,8) + '...' || 'Anónimo'}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 flex items-center">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={14} sm:size={16} 
                                className={
                                  i < review.rating
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300 dark:text-gray-600'
                                }
                              />
                            ))}
                            <span className="ml-1">({review.rating || '0'})</span>
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-300 max-w-[150px] sm:max-w-xs overflow-hidden text-ellipsis">
                            {review.comment ? review.comment.substring(0, 100) + (review.comment.length > 100 ? '...' : '') : 'Sin comentario'}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 hidden sm:table-cell">
                            {displayDate}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm">
                            <select
                              id={`review-status-${review.id}`}
                              name="reviewStatus"
                              value={review.status || 'pending'} 
                              onChange={(e) => handleUpdateReviewStatus(review.id, e.target.value)}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 text-sm" 
                            >
                              <option value="pending">Pendiente</option>
                              <option value="approved">Aprobado</option>
                              <option value="rejected">Rechazado</option>
                            </select>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleDeleteReview(review.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-600 inline-flex items-center p-1 sm:p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900 transition-colors duration-200"
                              title="Eliminar Reseña"
                            >
                              <Trash2 size={18} sm:size={20} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Sección de Métricas de Ventas */}
        {activeTab === 'metrics' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <h3 className="text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-gray-200 mb-3 sm:mb-0">Métricas de Ventas</h3>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                <select
                  id="metrics-time-range"
                  name="metricsTimeRange"
                  value={selectedMetricsTimeRange}
                  onChange={(e) => setSelectedMetricsTimeRange(e.target.value)}
                  className="w-full sm:w-auto p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-red-500 focus:border-red-500 text-sm sm:text-base"
                >
                  <option value="all">Todo el Tiempo</option>
                  <option value="1week">Última Semana</option>
                  <option value="15days">Últimos 15 Días</option>
                  <option value="1month">Último Mes</option>
                </select>
                <button
                  onClick={handleClearAllOrders}
                  disabled={clearingOrders} 
                  className="bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300 flex items-center justify-center text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Eraser size={20} />
                  {clearingOrders ? 'Borrando...' : 'Borrar Todos los Pedidos'}
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-4 sm:p-5 shadow-md flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium opacity-80">Ingresos Totales</p>
                  <p className="text-2xl sm:text-3xl font-bold">${totalRevenue}</p>
                </div>
                <DollarSign size={32} sm:size={40} className="opacity-70" />
              </div>
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4 sm:p-5 shadow-md flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium opacity-80">Total de Pedidos</p>
                  <p className="text-2xl sm:text-3xl font-bold">{totalOrdersCount}</p>
                </div>
                <ListOrdered size={32} sm:size={40} className="opacity-70" />
              </div>
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-4 sm:p-5 shadow-md flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium opacity-80">Valor Promedio de Pedido</p>
                  <p className="text-2xl sm:text-3xl font-bold">${averageOrderValue}</p>
                </div>
                <TrendingUp size={32} sm:size={40} className="opacity-70" />
              </div>
            </div>

            {mostOrderedProducts.length === 0 && topRevenueProducts.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-10">
                No hay datos de ventas para mostrar o no se procesaron pedidos en este rango de tiempo.
              </p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Productos Más Vendidos (por Cantidad)</h4>
                  <div className="overflow-x-auto rounded-lg shadow-md">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Producto</th>
                          <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cantidad Vendida</th>
                           <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ingresos</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {mostOrderedProducts.slice(0, 5).map((productMetric, index) => (
                          <tr key={index}>
                            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                              {productMetric.name}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {productMetric.totalQuantity} unidades
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              ${Math.floor(productMetric.totalRevenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h4 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Productos con Mayor Ingreso Generado</h4>
                  <div className="overflow-x-auto rounded-lg shadow-md">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Producto</th>
                          <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ingresos Totales</th>
                          <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cantidad Vendida</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {topRevenueProducts.slice(0, 5).map((productMetric, index) => (
                          <tr key={index}>
                            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                              {productMetric.name}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              ${Math.floor(productMetric.totalRevenue)}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {productMetric.totalQuantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
