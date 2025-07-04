import React, { useState, useCallback, useRef, useEffect } from 'react';
import { LogIn, XCircle, User, Lock, Loader2, Eye, EyeOff } from 'lucide-react'; // Importa iconos adicionales

function AdminLogin({ onLogin, onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({}); // Estado para manejar errores de validación
  const [showPassword, setShowPassword] = useState(false); // Nuevo estado para mostrar/ocultar contraseña

  const emailInputRef = useRef(null); // Ref para el foco inicial

  // Efecto para enfocar el campo de email al cargar el modal
  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, []);

  // Función de validación del formulario
  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'El email es requerido.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Formato de email inválido.';
    }
    if (!password.trim()) {
      newErrors.password = 'La contraseña es requerida.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Retorna true si no hay errores
  }, [email, password]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!validateForm()) { // Ejecuta la validación antes de enviar
      return;
    }

    setLoading(true);
    try {
      await onLogin(email, password); // Llama a la función de login pasada desde App.jsx
      // El éxito/error se manejará en App.jsx a través de las notificaciones
      // y la redirección. Este componente solo se encarga de la UI del login.
    } catch (error) {
      // Los errores ya son manejados por onLogin y showNotification en App.jsx
      console.error("Error en el envío del formulario de login:", error);
    } finally {
      setLoading(false);
    }
  }, [email, password, onLogin, validateForm]);

  // Función para alternar la visibilidad de la contraseña
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto transform scale-95 animate-scale-in">
        {/* Encabezado del modal */}
        <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <LogIn size={32} className="text-red-600" /> Acceso Administrador
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full p-1"
            aria-label="Cerrar modal de login"
          >
            <XCircle size={28} /> {/* Cambiado a XCircle para consistencia */}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campo Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
            <div className="relative">
              <User size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: '' })); }} // Limpiar error al escribir
                ref={emailInputRef}
                className={`w-full pl-10 pr-4 py-2 border rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white transition-colors duration-200 ${errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                placeholder="admin@ejemplo.com"
                required
                autoComplete="email" // Sugerencia de autocompletado para email
                aria-invalid={!!errors.email} // Indica si hay un error de validación
                aria-describedby={errors.email ? 'email-error' : undefined} // Enlaza con el mensaje de error
              />
            </div>
            {errors.email && <p id="email-error" className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          {/* Campo Contraseña */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contraseña</label>
            <div className="relative">
              <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type={showPassword ? "text" : "password"} // Tipo de input dinámico
                id="password"
                name="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: '' })); }} // Limpiar error al escribir
                className={`w-full pl-10 pr-10 py-2 border rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white transition-colors duration-200 ${errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                placeholder="••••••••"
                required
                autoComplete="current-password" // Sugerencia de autocompletado para la contraseña actual
                aria-invalid={!!errors.password} // Indica si hay un error de validación
                aria-describedby={errors.password ? 'password-error' : undefined} // Enlaza con el mensaje de error
              />
              <button
                type="button" // Importante: type="button" para no enviar el formulario
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && <p id="password-error" className="mt-1 text-sm text-red-600">{errors.password}</p>}
          </div>

          {/* Botón de Login */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin mr-2" />
            ) : (
              <LogIn size={20} />
            )}
            {loading ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;
