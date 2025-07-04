import { useEffect, useState, useCallback, useMemo } from 'react';
import ProductCard from './components/ProductCard';
import ShoppingCartModal from './components/ShoppingCartModal';
import OrderFormModal from './components/OrderFormModal';
import OrderSummaryModal from './components/OrderSummaryModal';
import ProductDetailsModal from './components/ProductDetailsModal';
import ToastNotification from './components/ToastNotification';
import FeaturedProductsSection from './components/FeaturedProductsSection';
import Footer from './components/Footer';
import PowaContactForm from './components/PowaContactForm';
import './App.css';
import { ShoppingCart, Search, Sun, Moon, ArrowUp, Heart, UserCheck, LogOut, LayoutDashboard, Loader2 } from 'lucide-react'; 

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, onSnapshot, query, addDoc, updateDoc } from 'firebase/firestore';

import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';

import { Routes, Route, useNavigate } from 'react-router-dom';


function App() {
  // Estados de la aplicación
  const [productos, setProductos] = useState([]);
  const [categoriasAbiertas, setCategoriasAbiertas] = useState({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isOrderFormModalOpen, setIsOrderFormModalOpen] = useState(false);
  const [isOrderSummaryModalOpen, setIsOrderSummaryModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isProductDetailsModalOpen, setIsProductDetailsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [toast, setToast] = useState({
    message: '',
    type: 'info',
    show: false,
    duration: 3000,
    id: null,
  });

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hasShownAdminWelcome, setHasShownAdminWelcome] = useState(() => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const saved = sessionStorage.getItem('hasShownAdminWelcomeThisSession');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  // Notificaciones Toast
  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    setToast({
      message,
      type,
      show: true,
      duration,
      id: Date.now(),
    });
  }, []);


  const [isDarkMode, setIsDarkMode] = useState(false);
  const [favoriteProductIds, setFavoriteProductIds] = useState([]);

  // Estados y configuraciones de Firebase
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(false);

  const [currentPage, setCurrentPage] = useState('home');
  const navigate = useNavigate();

  const canvasAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  const canvasFirebaseConfig = typeof __firebase_config !== 'undefined' && __firebase_config !== ''
    ? JSON.parse(__firebase_config)
    : {};
  const canvasInitialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;


  const localFirebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  };


  const firebaseConfig = Object.keys(canvasFirebaseConfig).length > 0 ? canvasFirebaseConfig : localFirebaseConfig;
  const initialAuthToken = canvasInitialAuthToken;


  // useEffect para cargar estados de localStorage al iniciar la app
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedTheme = localStorage.getItem('theme');
      setIsDarkMode(savedTheme === 'dark');

      const savedFavorites = localStorage.getItem('favoriteProductIds');
      setFavoriteProductIds(savedFavorites ? JSON.parse(savedFavorites) : []);
    } else {
      // Por defecto, si no hay localStorage, usa la preferencia del sistema
      setIsDarkMode(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  // Nuevo useEffect para guardar hasShownAdminWelcome en sessionStorage cuando cambie
  useEffect(() => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem('hasShownAdminWelcomeThisSession', JSON.stringify(hasShownAdminWelcome));
    }
  }, [hasShownAdminWelcome]);

  // Aplica la clase 'dark' al HTML según el modo oscuro
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Alterna el modo oscuro
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prevMode => !prevMode);
  }, []);

  // Primer useEffect: Inicialización de Firebase (se ejecuta solo una vez)
  useEffect(() => {
    const isFirebaseConfigValid = firebaseConfig && Object.keys(firebaseConfig).length > 0 && firebaseConfig.apiKey;

    if (!isFirebaseConfigValid) {
      setError('Configuración de Firebase no disponible. Las funciones de base de datos y administración no funcionarán.');
      setUserId(crypto.randomUUID()); // Asigna un ID de usuario aleatorio para continuar la app sin Firebase Auth
      setIsAuthReady(true);
      setIsLoadingAuth(false); 
      return;
    }

    if (!isFirebaseInitialized) {
      let firebaseApp;
      if (getApps().length === 0) { // Verifica si ya hay una instancia de Firebase App
        firebaseApp = initializeApp(firebaseConfig);
      } else {
        firebaseApp = getApp(); // Si ya existe, obtén la instancia existente
      }

      const firestore = getFirestore(firebaseApp);
      const firebaseAuth = getAuth(firebaseApp);

      setDb(firestore);
      setAuth(firebaseAuth);
      setIsFirebaseInitialized(true); 
    }
  }, [firebaseConfig, isFirebaseInitialized]); // Dependencias: la configuración y el estado de inicialización


  // Segundo useEffect: Manejo de cambios de estado de autenticación (se ejecuta cuando 'auth' está listo)
  // Gestiona el estado de autenticación (userId) e inicia inicios de sesión.
  // La carga/creación del perfil se manejará en un useEffect SEPARADO.
  useEffect(() => {
    if (!auth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid); // Actualiza el estado del ID de usuario
      } else {
        // Si no hay un usuario autenticado y no está en un flujo controlado (inicio/cierre de sesión de administrador, contacto powa)
        // intentar inicio de sesión anónimo o inicio de sesión con token personalizado.
        if (!isLoggingOut && currentPage !== 'admin-login' && currentPage !== 'admin-dashboard' && currentPage !== 'powa-contact') {
          if (initialAuthToken) { 
              try {
                  await signInWithCustomToken(auth, initialAuthToken);
                  // onAuthStateChanged se disparará de nuevo con el usuario autenticado
              } catch (tokenSignInError) {
                  showNotification('Error de autenticación con token. Algunas funciones pueden estar limitadas.', 'error'); 
                  setUserId(crypto.randomUUID()); // Fallback si la autenticación falla
              }
          } else { 
              try {
                  await signInAnonymously(auth);
                  // onAuthStateChanged se disparará de nuevo con el usuario autenticado
              } catch (signInError) {
                  showNotification('Error de autenticación anónima. Algunas funciones pueden estar limitadas.', 'error'); 
                  setUserId(crypto.randomUUID()); // Fallback si la autenticación falla
              }
              
          }
        } else {
          setUserId(null); // Borra el ID de usuario si no hay usuario autenticado y no se está intentando iniciar/cerrar sesión
        }
        setUserProfile(null); // Borra el perfil si no hay usuario
      }
      setIsAuthReady(true); // El escuchador de autenticación ha completado su verificación inicial
      setIsLoadingAuth(false); // La carga de autenticación está completa
    });

    return () => {
      unsubscribe(); // Desuscribirse del escuchador al desmontar el componente
    };
  }, [auth, initialAuthToken, isLoggingOut, currentPage, showNotification]);

  // Tercer useEffect: Gestiona el perfil del usuario (carga/crea) una vez que userId y db estén listos
  useEffect(() => {
    if (!db || !userId || !isAuthReady) {
      return;
    }
    // Si isLoggingOut es verdadero, no intentamos cargar/crear el perfil.
    // Esto se maneja borrando el estado en handleAdminLogout.
    if (isLoggingOut) {
      return;
    }

    const fetchOrCreateUserProfile = async () => {
      const userProfileRef = doc(db, `artifacts/${canvasAppId}/public/data/users/${userId}`);
      try {
        const userProfileSnap = await getDoc(userProfileRef);
        if (userProfileSnap.exists()) {
          const profileData = { id: userProfileSnap.id, ...userProfileSnap.data() };
          setUserProfile(profileData);
        } else {
          const newUserProfile = {
            role: 'user', // Rol por defecto
            createdAt: new Date().toISOString(),
          };
          // Vuelve a verificar auth.currentUser.uid antes de escribir, como último recurso
          if (auth && auth.currentUser && auth.currentUser.uid === userId) {
            await setDoc(userProfileRef, newUserProfile); 
            const profileData = { id: userId, ...newUserProfile };
            setUserProfile(profileData);
          } else {
            // Esto puede ocurrir si el auth state cambia muy rápido o hay un desajuste.
            showNotification('Error de sincronización de autenticación. Por favor, recarga la página o inténtalo de nuevo.', 'warning', 7000);
            // Aun así, establece un perfil predeterminado para evitar romper la interfaz de usuario, incluso si no se persiste de inmediato
            setUserProfile({ id: userId, role: 'user' }); 
          }
        }
      } catch (profileError) {
        // Asegúrate de que el estado del perfil no sea nulo incluso en caso de error
        setUserProfile({ id: userId, role: 'user' }); 
        if (profileError.code === 'permission-denied') {
            showNotification('Error de permisos al cargar/crear perfil. Consulta las reglas de seguridad de Firestore.', 'error', 10000);
        } else {
            showNotification(`Error desconocido al cargar/crear perfil: ${profileError.message}`, 'error', 8000);
        }
      }
    };

    fetchOrCreateUserProfile();
  }, [userId, db, isAuthReady, auth, canvasAppId, showNotification, isLoggingOut]); // Dependencias


  // Efecto para redirigir si el usuario no es admin y está en el dashboard
  useEffect(() => {
    if (currentPage === 'admin-dashboard' && (!userProfile || userProfile.role !== 'admin')) {
      setCurrentPage('home');
      setHasShownAdminWelcome(false);
      navigate('/'); // Redirige usando react-router-dom
    }
  }, [currentPage, userProfile, setCurrentPage, navigate]);

  // Manejador de inicio de sesión de administrador
  const handleAdminLogin = useCallback(async (email, password) => {
    if (!auth) {
      showNotification("Firebase Auth no inicializado correctamente.", "error");
      return;
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (db && user.uid) {
        const userProfileRef = doc(db, `artifacts/${canvasAppId}/public/data/users/${user.uid}`);
        const userProfileSnap = await getDoc(userProfileRef);
        let profileData;

        if (userProfileSnap.exists()) {
          profileData = userProfileSnap.data();
        } else {
          profileData = { role: 'user', createdAt: new Date().toISOString() }; 
          
          if (auth.currentUser && auth.currentUser.uid === user.uid) {
            await setDoc(userProfileRef, profileData);
          } else {
            showNotification('Error de sincronización de autenticación. Recarga la página si persisten los problemas.', 'warning', 7000);
          }
        }
        const profile = { id: user.uid, ...profileData };

        setUserProfile(profile);
        setUserId(user.uid);

        if (profile.role !== 'admin') {
          await signOut(auth); // Cierra sesión si no es admin
          showNotification('Acceso denegado: Este usuario no es un administrador.', 'error');
          setCurrentPage('admin-login');
          navigate('/login-admin'); // Redirige a la página de login
        } else {
          setHasShownAdminWelcome(true); // Establece en verdadero para que AdminDashboard muestre el mensaje
          setCurrentPage('admin-dashboard');
          navigate('/dashboard-admin'); // Redirige al dashboard
        }

      } else {
        showNotification('Error: Firestore o UID de usuario no disponibles para verificar el perfil.', 'error');
        if (auth.currentUser) {
          await signOut(auth); // Cierra sesión si hay un problema
        }
        setCurrentPage('admin-login');
        navigate('/login-admin');
      }

    } catch (loginError) {
      let errorMessage = 'Error al iniciar sesión. Por favor, inténtalo de nuevo.';
      switch (loginError.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'Credenciales incorrectas. Verifica tu email y contraseña.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Formato de correo electrónico inválido.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Este usuario ha sido deshabilitado.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Demasiados intentos fallidos. Por favor, intenta de nuevo más tarde.';
          break;
        default:
          errorMessage = `Error de autenticación: ${loginError.message}`;
          break;
      }
      showNotification(errorMessage, 'error');
    }
  }, [auth, db, canvasAppId, showNotification, setCurrentPage, setHasShownAdminWelcome, navigate]);

  // Manejador de cierre de sesión de administrador
  const handleAdminLogout = useCallback(async () => {
    if (auth) {
      try {
        setIsLoggingOut(true); 
        setHasShownAdminWelcome(false); // Reinicia para que se muestre de nuevo en el próximo inicio de sesión en la misma sesión
        await signOut(auth);
        showNotification('Sesión cerrada.', 'info'); 
        setCurrentPage('home'); // Asegura la redirección interna a la página de inicio
        navigate('/'); // Redirige usando react-router-dom a la raíz
      } catch (logoutError) {
        showNotification('Error al cerrar sesión.', 'error');
      } finally {
        // CRÍTICO: Asegurarse de que isLoggingOut se restablezca a falso en cualquier caso.
        // Esto permite que onAuthStateChanged (o el siguiente flujo de autenticación anónima)
        // complete el ciclo de carga.
        setIsLoggingOut(false); 
      }
    }
  }, [auth, showNotification, setHasShownAdminWelcome, navigate]);

  // Manejadores para el modal de detalles del producto
  const handleOpenProductDetails = useCallback((product) => {
    setSelectedProduct(product);
    setIsProductDetailsModalOpen(true);
  }, []);

  const handleCloseProductDetails = useCallback(() => {
    setIsProductDetailsModalOpen(false);
    setSelectedProduct(null);
  }, []);

  // Botón de scroll a la parte superior
  const [showScrollToTopButton, setShowScrollToTopButton] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollToTopButton(true);
      } else {
        setShowScrollToTopButton(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);

  // Lógica para cargar productos desde Firestore
  useEffect(() => {
    // Solo cargar productos una vez que db esté inicializado y auth esté listo
    if (!db || !isAuthReady) {
      return;
    }

    setLoadingProducts(true);
    const productsCollectionRef = collection(db, `artifacts/${canvasAppId}/public/data/products`);
    const q = query(productsCollectionRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map(doc => {
        const { id, ...dataWithoutId } = doc.data();
        return {
          id: doc.id,
          ...dataWithoutId,
        };
      });
      setProductos(productsData);

      // Inicializa el estado de las categorías como cerradas por defecto
      const initialCategoriesState = productsData.reduce((acc, p) => {
        if (p.category) {
          acc[p.category] = false;
        }
        return acc;
      }, {});
      setCategoriasAbiertas(initialCategoriesState);

      setLoadingProducts(false);
    }, (err) => {
      setError("No se pudieron cargar los productos. Por favor, inténtalo de nuevo más tarde.");
      setLoadingProducts(false); // Detener la carga si hay error
    });

    return () => {
      unsubscribe(); // Limpiar el escuchador al desmontar
    };
  }, [db, isAuthReady, canvasAppId]); 

  // Guarda IDs de productos favoritos en localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('favoriteProductIds', JSON.stringify(favoriteProductIds));
    }
  }, [favoriteProductIds]);

  // Alterna la visibilidad de una categoría de productos
  const toggleCategoria = useCallback((categoria) => {
    setCategoriasAbiertas((prev) => ({
      ...prev,
      [categoria]: !prev[categoria],
    }));
  }, []);

  // Alterna el estado de favorito de un producto
  const toggleFavorite = useCallback((productId) => {
    setFavoriteProductIds(prevIds => {
      if (prevIds.includes(productId)) {
        showNotification('Producto removido de favoritos', 'error', 1500);
        return prevIds.filter(id => id !== productId);
      } else {
        showNotification('Producto añadido a favoritos', 'success', 1500);
        return [...prevIds, productId];
      }
    });
  }, [showNotification]);

  // Filtra y memoriza todos los productos por término de búsqueda
  const allProducts = useMemo(() => {
    return productos.filter(producto =>
      producto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (producto.descripcion && producto.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [productos, searchTerm]);

  // Agrupa productos por categoría
  const productosPorCategoria = useMemo(() => {
    const grouped = allProducts.reduce((acc, producto) => {
      const categoria = producto.category || 'Sin categoría';
      if (!acc[categoria]) acc[categoria] = [];
      acc[categoria].push(producto);
      return acc;
    }, {});
    return grouped;
  }, [allProducts]);

  // Ordena los productos dentro de cada categoría alfabéticamente
  const sortedProductosPorCategoria = useMemo(() => {
    const categoriesArray = Object.entries(productosPorCategoria);
    categoriesArray.forEach(([categoria, productosArray]) => {
      productosArray.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    });
    return categoriesArray;
  }, [productosPorCategoria]);

  // Obtiene y ordena los productos favoritos
  const favoriteProducts = useMemo(() => {
    return allProducts.filter(p => favoriteProductIds.includes(p.id))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '')); // También ordenar favoritos
  }, [allProducts, favoriteProductIds]);

  // Obtiene y ordena los productos destacados (primeros 5)
  const featuredProducts = useMemo(() => {
    return productos.slice(0, 5)
      .sort((a, b) => (a.name || '').localeCompare(b.name || '')); // También ordenar productos destacados
  }, [productos]);

  // Añade un producto al carrito o incrementa su cantidad
  const handleAddToCart = useCallback((productToAdd, quantityToAdd = 1) => {
    setCartItems((prevItems) => {
      // Verificar si hay suficiente stock antes de añadir
      const productInProductsState = productos.find(p => p.id === productToAdd.id);
      const currentStock = productInProductsState ? productInProductsState.stock : 0;
      const existingItem = prevItems.find((item) => item.id === productToAdd.id);
      const newQuantity = existingItem ? existingItem.quantity + quantityToAdd : quantityToAdd;

      if (newQuantity > currentStock) {
        showNotification(`No hay suficiente stock para añadir ${quantityToAdd} unidad(es) de ${productToAdd.name}. Stock disponible: ${currentStock}`, 'error', 3000);
        return prevItems; // No modificar el carrito si no hay stock
      }

      if (existingItem) {
        showNotification(`${productToAdd.name} +${quantityToAdd} unidad(es)`, 'info', 1500);
        return prevItems.map((item) =>
          item.id === productToAdd.id ? { ...item, quantity: item.quantity + quantityToAdd } : item
        );
      } else {
        showNotification(`"${productToAdd.name}" añadido al carrito`, 'success', 2000);
        return [...prevItems, { ...productToAdd, quantity: quantityToAdd }];
      }
    });
  }, [showNotification, productos]); // Depende de 'productos' para verificar el stock

  // Incrementa la cantidad de un producto en el carrito
  const handleIncreaseQuantity = useCallback((productId) => {
    setCartItems((prevItems) => {
      const productInProductsState = productos.find(p => p.id === productId);
      const currentStock = productInProductsState ? productInProductsState.stock : 0;

      return prevItems.map((item) => {
        if (item.id === productId) {
          if (item.quantity + 1 > currentStock) {
            showNotification(`No hay suficiente stock para añadir más de ${item.name}. Stock disponible: ${currentStock}`, 'error', 2000);
            return item; // No incrementar si excede el stock
          }
          return { ...item, quantity: item.quantity + 1 };
        }
        return item;
      });
    });
  }, [showNotification, productos]); // Depende de 'productos' para verificar el stock

  // Decrementa la cantidad de un producto en el carrito
  const handleDecreaseQuantity = useCallback((productId) => {
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId
          ? { ...item, quantity: item.quantity > 1 ? item.quantity - 1 : 1 }
          : item
      ).filter(item => item.quantity > 0) // Elimina si la cantidad llega a 0
    );
  }, []);

  // Elimina un producto del carrito
  const handleRemoveItem = useCallback((productId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== productId));
    showNotification('Producto eliminado del carrito', 'error', 2000);
  }, [showNotification]);

  // Vacía todo el carrito
  const handleClearCart = useCallback(() => {
    setCartItems([]);
    showNotification('Carrito vaciado', 'error', 2000);
  }, [showNotification]);

  // Navega del carrito al resumen del pedido
  const handleContinueToSummary = useCallback(() => {
    setIsCartModalOpen(false);
    setIsOrderSummaryModal(true);
  }, []);

  // Navega del resumen al formulario de pedido
  const handleContinueToForm = useCallback(() => {
    setIsOrderSummaryModal(false);
    setIsOrderFormModalOpen(true);
  }, []);

  // Envía el pedido (a Firestore y WhatsApp)
  const handleSendOrder = useCallback(async ({ name, address, phone, paymentMethod, cashAmount, deliveryMethod, orderType, orderTime, notes }) => {
    if (!db) {
      showNotification('Error: Base de datos no disponible para guardar el pedido. Intenta recargar la página.', 'error', 5000);
      return;
    }
    if (!userId) {
        showNotification('Error: ID de usuario no disponible. Asegúrate de que la autenticación se ha completado.', 'error', 5000);
        return;
    }
    if (cartItems.length === 0) {
        showNotification('El carrito está vacío. Añade productos antes de hacer un pedido.', 'error', 3000);
        return;
    }

    const orderDetailsForWhatsapp = cartItems.map(item =>
      `${item.quantity}x ${item.name} ($${Math.floor(item.precio)} c/u)`
    ).join('\n');

    const totalCalculated = cartItems.reduce((sum, item) => sum + item.precio * item.quantity, 0);
    const totalForDisplay = Math.floor(totalCalculated);

    let paymentInfoWhatsapp = '';
    let status = 'Pendiente'; // Estado inicial del pedido
    let deliveryInfoWhatsapp = '';
    let orderTimeInfoWhatsapp = '';

    if (paymentMethod === 'cash') {
      const parsedCashAmount = parseFloat(cashAmount);
      const change = (parsedCashAmount >= totalForDisplay) ? Math.floor(parsedCashAmount - totalForDisplay) : 0;
      paymentInfoWhatsapp = `*Método de Pago:* Efectivo\n*Abona con:* $${Math.floor(parsedCashAmount)}\n*Vuelto:* $${change}`;
    } else if (paymentMethod === 'mercadopago') {
      paymentInfoWhatsapp = `*Método de Pago:* Mercado Pago\n_(Se requiere comprobante para confirmar)_`;
    }

    if (deliveryMethod === 'pickup') {
      deliveryInfoWhatsapp = `*Método de Entrega:* Retiro en el local (Av. Monteverde N° 1181, Quilmes)`;
    } else if (deliveryMethod === 'delivery') {
      deliveryInfoWhatsapp = `*Método de Entrega:* Delivery a domicilio (sin cargo)\n*Dirección:* ${address}`;
    }

    if (orderType === 'immediate') {
      orderTimeInfoWhatsapp = `*Tipo de Pedido:* Inmediato`;
    } else if (orderType === 'reserved' && orderTime) {
      const reservedDate = new Date(orderTime);
      orderTimeInfoWhatsapp = `*Tipo de Pedido:* Reserva para el ${reservedDate.toLocaleString('es-AR')}`;
    }

    const whatsappMessage = `
*--- CAPRICCIO APP ---*

*Datos del Cliente:*
Nombre: ${name}
Teléfono: ${phone}
${deliveryInfoWhatsapp}
${orderTimeInfoWhatsapp}
${notes ? `*Notas:* ${notes}` : ''}

*Detalle del Pedido:*
${orderDetailsForWhatsapp}

*Total a Pagar:* $${totalForDisplay}

${paymentInfoWhatsapp}

¡Gracias por tu pedido!
`.trim();

    // Guarda el pedido en Firestore
    try {
      const ordersCollectionRef = collection(db, `artifacts/${canvasAppId}/public/data/orders`);
      const orderData = {
        userId: userId || 'anonimo',
        cartItems: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          precio: item.precio,
          // Puedes añadir más detalles del producto si los necesitas en el pedido guardado
        })),
        total: totalCalculated,
        customerInfo: { name, address, phone },
        paymentMethod: paymentMethod,
        cashAmount: parseFloat(cashAmount) || 0,
        change: Math.floor(parseFloat(cashAmount) - totalCalculated),
        deliveryMethod: deliveryMethod, // Guardar método de entrega
        orderType: orderType,           // Guardar tipo de pedido
        orderTime: orderTime,           // Guardar fecha/hora de reserva
        notes: notes,                   // Guardar notas
        createdAt: new Date().toISOString(),
        status: status,
      };
      await addDoc(ordersCollectionRef, orderData);
      showNotification('Pedido guardado y enviado a WhatsApp!', 'success', 3000);

      // =====================================================================
      // LÓGICA: Descontar stock de los productos
      // =====================================================================
      for (const item of cartItems) {
        try {
          const productRef = doc(db, `artifacts/${canvasAppId}/public/data/products/${item.id}`);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            const currentStock = productSnap.data().stock || 0;
            const newStock = Math.max(0, currentStock - item.quantity); // Asegura que el stock no sea negativo
            await updateDoc(productRef, { stock: newStock });
            console.log(`Stock de producto ${item.name} (ID: ${item.id}) actualizado de ${currentStock} a ${newStock}`);
          } else {
            console.warn(`Producto con ID ${item.id} no encontrado en Firestore para actualizar stock.`);
          }
        } catch (stockUpdateError) {
          console.error(`Error al actualizar stock para el producto ${item.id}:`, stockUpdateError);
          showNotification(`Advertencia: No se pudo actualizar el stock de ${item.name}.`, 'warning', 5000);
        }
      }
      // =====================================================================

    } catch (firebaseError) {
      let userErrorMessage = 'Error al guardar el pedido. Por favor, inténtalo de nuevo.';
      if (firebaseError.code === 'permission-denied') {
          userErrorMessage = 'Error: Permisos insuficientes para guardar el pedido. Asegúrate de tus reglas de seguridad en Firebase.'; 
      } else if (firebaseError.code === 'unavailable' || firebaseError.code === 'internal') {
          userErrorMessage = 'Error de conexión con la base de datos. Por favor, revisa tu conexión a internet e inténtalo de nuevo.';
      } else if (firebaseError.code === 'resource-exhausted') { 
          userErrorMessage = 'Error: Límite de cuota excedido. Por favor, inténtalo de nuevo más tarde.';
      }
      showNotification(userErrorMessage, 'error', 7000); 
    }

    const encodedMessage = encodeURIComponent(whatsappMessage);
    const whatsappNumber = '5491126884940'; // Número de WhatsApp de destino

    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank'); // Abre WhatsApp en una nueva pestaña

    setCartItems([]); // Vacía el carrito después de enviar
    setIsOrderFormModalOpen(false); // Cierra el modal del formulario
  }, [cartItems, showNotification, db, canvasAppId, userId, productos]);


  // Funciones para manejar la navegación interna de la aplicación (usando `currentPage` y `navigate`)
  // DEFINICIÓN DE LAS FUNCIONES PARA EL FOOTER Y OTRAS NAVEGACIONES
  const handleOpenPowaContactForm = useCallback(() => {
    setCurrentPage('powa-contact');
    navigate('/contact');
  }, [navigate]);

  const handleClosePowaContactForm = useCallback(() => {
    setCurrentPage('home');
    navigate('/');
  }, [navigate]);

  const handleOpenAdminLoginFromFooter = useCallback(() => {
    setCurrentPage('admin-login');
    navigate('/login-admin');
  }, [navigate]);
  // FIN DE DEFINICIÓN DE FUNCIONES

  // Condición de carga ajustada: espera a que tanto los productos como la autenticación estén listos
  const isLoadingApp = loadingProducts || isLoadingAuth || isLoggingOut; 

  if (isLoadingApp) {
    return (
      // El fondo será el del body (definido en index.html)
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-900 dark:text-gray-100 p-4 sm:p-6 lg:p-8">
        {/* Título de carga: Centrado y más grande */}
        <div className="w-full mb-12 mt-24 flex justify-center">
          <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-9xl font-extrabold drop-shadow-2xl">
            <span className="inline-flex items-center gap-4 text-transparent bg-clip-text bg-gradient-to-br from-red-700 via-orange-600 to-yellow-400 dark:from-red-500 dark:via-orange-400 dark:to-yellow-200">
              Capriccio de Pizza
            </span>
          </h1>
        </div>
        {/* REEMPLAZADO: ProductCardSkeleton por Loader2 (spinner) */}
        <div className="flex items-center justify-center mt-8">
          <Loader2 className="animate-spin text-red-500 dark:text-red-300" size={64} />
        </div>
        <p className="text-xl font-semibold text-gray-700 dark:text-gray-300 mt-8 animate-pulse">
          Cargando delicias...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      // El fondo será el del body (definido en index.html)
      <div className="min-h-screen flex items-center justify-center text-red-600 dark:text-red-400">
        <p className="text-xl font-semibold">{error}</p>
      </div>
    );
  }

  return (
    // El div principal de la aplicación. min-h-screen asegura que la página tenga al menos el alto de la ventana.
    // Los paddings responsivos (p-4 sm:p-6 lg:p-8) dan espacio alrededor del contenido.
    // El fondo (degradado en claro, oscuro en dark) ahora es manejado por index.html y la clase 'dark' en el html.
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      {/* Rutas de la aplicación */}
      <Routes>
        {/* Ruta para la página de inicio (ruta raíz) */}
        <Route path="/" element={
          <>
            {/* Botones de control (Modo Oscuro, Panel de Administración, Cerrar Sesión): Siempre fijos en la parte superior */}
            <div className="fixed top-6 left-6 flex space-x-4 sm:space-x-8 z-50"> 
              <button
                onClick={toggleDarkMode}
                className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-3 rounded-full shadow-lg transition-colors duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:focus:ring-600"
                aria-label="Alternar modo oscuro"
              >
                {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
              </button>
              {userProfile?.role === 'admin' && ( // Muestra el botón solo si el usuario es admin
                <button
                  onClick={() => { setCurrentPage('admin-dashboard'); navigate('/dashboard-admin'); }}
                  className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-colors duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300"
                  aria-label="Ir al Panel de Administración"
                >
                  <LayoutDashboard size={24} />
                </button>
              )}
              {userProfile?.role === 'admin' && ( // Muestra el botón de cerrar sesión si el usuario es admin
                <button
                  onClick={handleAdminLogout}
                  className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-full shadow-lg transition-colors duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300"
                  aria-label="Cerrar sesión de administrador"
                >
                  <LogOut size={24} />
                </button>
              )}
            </div>

            {/* Carrito de compras: Posición fija */}
            <button
              onClick={() => setIsCartModalOpen(true)}
              className="fixed bottom-24 right-6 bg-red-600 hover:bg-red-700 text-white p-3 rounded-full shadow-lg text-xl font-bold flex items-center gap-2 z-40 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300"
              aria-label="Abrir carrito"
            >
              <ShoppingCart size={24} /> 
              <span className="hidden sm:inline">({cartItems.length})</span>
              <span className="sm:hidden">{cartItems.length}</span>
            </button>

            {/* Botón de desplazar hacia arriba: Posición fija */}
            {showScrollToTopButton && (
              <button
                onClick={scrollToTop}
                className="fixed bottom-40 right-6 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg z-40 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300"
                aria-label="Desplazarse hacia arriba"
              >
                <ArrowUp size={24} />
              </button>
            )}

            {/* Título principal de la aplicación: Centrado y con margen superior para empujar el contenido fijo */}
            {/* Ajuste de `mt` para empujar el título hacia abajo y evitar superposición en móviles */}
            <div className="w-full mt-24 sm:mt-28 md:mt-32 mb-12 flex flex-col sm:flex-row justify-center items-center gap-4">
              <img
                src="/logo-capriccio2.jpeg"
                alt="Logo Capriccio de Pizza"
                className="h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 lg:h-36 lg:w-36 xl:h-40 xl:w-40 object-cover animate-pizza-jiggle rounded-full" 
                onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/100x100/E0E0E0/ADADAD?text=Logo"; }}
              />
              <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-9xl font-extrabold drop-shadow-2xl text-center">
                <span className="inline-flex items-center text-transparent bg-clip-text bg-gradient-to-br from-red-700 via-orange-600 to-yellow-400 dark:from-red-500 dark:via-orange-400 dark:to-yellow-200">
                  Capriccio de Pizza
                </span>
              </h1>
            </div>

            {/* Barra de búsqueda */}
            <div className="max-w-xl mx-auto mb-10 relative">
              <input
                type="text"
                id="app-search-input" 
                name="search"    
                placeholder="Busca tu empanada, pizza o plato favorito..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-4 pl-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-400 shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" size={24} />
            </div>

            {/* Secciones de productos */}
            <div className="space-y-10 max-w-7xl mx-auto">
              <FeaturedProductsSection
                featuredProducts={featuredProducts}
                onAddToCart={handleAddToCart}
                onOpenDetails={handleOpenProductDetails}
                favoriteProductIds={favoriteProductIds}
                onToggleFavorite={toggleFavorite}
              />

              {favoriteProducts.length > 0 && (
                <div
                  key="Favoritos"
                  className="rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden transform transition-all duration-300 hover:scale-[1.005] hover:shadow-2xl"
                >
                  <button
                    onClick={() => toggleCategoria('Favoritos')}
                    className="w-full flex justify-between items-center px-6 sm:px-8 py-5 text-left text-3xl font-bold bg-gradient-to-r from-red-500 to-red-600 dark:from-red-700 dark:to-red-800 hover:from-red-600 hover:to-red-700 dark:hover:from-red-800 dark:hover:to-red-900 transition-all duration-300 rounded-t-3xl text-white shadow-md focus:outline-none focus:ring-4 focus:ring-red-300 dark:focus:ring-900"
                    aria-expanded={categoriasAbiertas['Favoritos']}
                  >
                    <span className="capitalize flex items-center gap-2">
                      <Heart size={28} className="text-red-300 fill-current" /> Favoritos
                    </span>
                    <span className="text-3xl transition-transform duration-300 transform">
                      {categoriasAbiertas['Favoritos'] ? '−' : '+'}
                    </span>
                  </button>

                  {categoriasAbiertas['Favoritos'] && (
                    <div className="p-6 sm:p-8 animate-fade-in-down">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
                        {favoriteProducts.map(producto => (
                          <ProductCard
                            key={producto.id}
                            producto={producto}
                            onAddToCart={handleAddToCart}
                            onOpenDetails={handleOpenProductDetails}
                            isFavorite={favoriteProductIds.includes(producto.id)}
                            onToggleFavorite={toggleFavorite}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {sortedProductosPorCategoria.map(([categoria, productos]) => (
                productos.length > 0 ? (
                  <div
                    key={categoria}
                    className="rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden transform transition-all duration-300 hover:scale-[1.005] hover:shadow-2xl"
                  >
                    <button
                      onClick={() => toggleCategoria(categoria)}
                      className="w-full flex justify-between items-center px-6 sm:px-8 py-5 text-left text-3xl font-bold bg-gradient-to-r from-red-500 to-red-600 dark:from-red-700 dark:to-red-800 hover:from-red-600 hover:to-red-700 dark:hover:from-red-800 dark:hover:to-red-900 transition-all duration-300 rounded-t-3xl text-white shadow-md focus:outline-none focus:ring-4 focus:ring-red-300 dark:focus:ring-900"
                      aria-expanded={categoriasAbiertas[categoria]}
                    >
                      <span className="capitalize flex items-center gap-2">
                        {categoria}
                      </span>
                      <span className="text-3xl transition-transform duration-300 transform">
                        {categoriasAbiertas[categoria] ? '−' : '+'}
                      </span>
                    </button>

                    {categoriasAbiertas[categoria] && (
                      <div className="p-6 sm:p-8 animate-fade-in-down">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
                          {productos.map(producto => (
                            <ProductCard
                              key={producto.id}
                              producto={producto}
                              onAddToCart={handleAddToCart}
                              onOpenDetails={handleOpenProductDetails}
                              isFavorite={favoriteProductIds.includes(producto.id)}
                              onToggleFavorite={toggleFavorite}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null
              ))}
            </div>
            
            {isCartModalOpen && (
              <ShoppingCartModal
                cartItems={cartItems}
                onClose={() => setIsCartModalOpen(false)}
                onIncreaseQuantity={handleIncreaseQuantity}
                onDecreaseQuantity={handleDecreaseQuantity}
                onRemoveItem={handleRemoveItem}
                onClearCart={handleClearCart}
                onContinue={handleContinueToForm} 
                onViewSummary={handleContinueToSummary} 
              />
            )}

            {isOrderSummaryModalOpen && (
              <OrderSummaryModal
                cartItems={cartItems}
                onClose={() => setIsOrderSummaryModal(false)}
                onBack={() => {
                  setIsOrderSummaryModal(false);
                  setIsCartModalOpen(true);
                }}
                onContinue={handleContinueToForm} 
              />
            )}

            {isOrderFormModalOpen && (
              <OrderFormModal
                cartItems={cartItems}
                onClose={() => setIsOrderFormModalOpen(false)}
                onBack={() => {
                  setIsOrderFormModalOpen(false);
                  setIsOrderSummaryModal(true);
                }}
                onSendOrder={(data) => {
                  handleSendOrder(data);
                }}
                showNotification={showNotification}
              />
            )}

            {isProductDetailsModalOpen && selectedProduct && (
              <ProductDetailsModal
                product={selectedProduct}
                onClose={handleCloseProductDetails}
                onAddToCart={handleAddToCart}
                db={db}
                appId={canvasAppId}
                userId={userId}
                showNotification={showNotification}
                userProfile={userProfile}
              />
            )}

            <ToastNotification
              key={toast.id}
              message={toast.message}
              type={toast.type}
              duration={toast.duration}
            />

            {/* Renderiza el pie de página, pasando la función para abrir el formulario de contacto Powa y la función de inicio de sesión de administrador */}
            <Footer
              onOpenPowaContactForm={handleOpenPowaContactForm}
              onOpenAdminLogin={handleOpenAdminLoginFromFooter}
              userProfile={userProfile}
            />
          </>
        } />

        {/* Ruta para el login de administrador */}
        <Route 
          path="/login-admin" 
          element={<AdminLogin onLogin={handleAdminLogin} onClose={() => navigate('/')} />} 
        />

        {/* Ruta protegida para el dashboard de administrador */}
        <Route 
          path="/dashboard-admin" 
          element={
            userProfile?.role === 'admin' ? (
              <AdminDashboard
                db={db}
                appId={canvasAppId}
                onLogout={handleAdminLogout}
                showNotification={showNotification}
                onGoToHome={() => navigate('/')} 
                hasShownAdminWelcome={hasShownAdminWelcome}
                setHasShownAdminWelcome={setHasShownAdminWelcome}
              />
            ) : (
              // Si no es admin, redirige al login o a la página principal
              <AdminLogin 
                onLogin={handleAdminLogin} 
                onClose={() => { showNotification('Acceso denegado: No eres administrador.', 'error'); navigate('/'); }} 
              />
            )
          } 
        />

        {/* Ruta para el formulario de contacto Powa */}
        <Route 
          path="/contact" 
          element={<PowaContactForm onClose={() => navigate('/')} showNotification={showNotification} />} 
        />

        {/* Ruta 404 (página no encontrada) */}
        <Route path="*" element={<h2 className="text-3xl font-bold text-center mt-10">404 - Página No Encontrada</h2>} />
      </Routes>
    </div>
  );
}

export default App;
