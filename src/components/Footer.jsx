import React from 'react';
import { Facebook, Instagram, Twitter, MapPin, Mail, Phone, Briefcase, UserCheck } from 'lucide-react'; // Añadido UserCheck

const Footer = ({ onOpenPowaContactForm, onOpenAdminLogin, userProfile }) => { // Recibe las nuevas props
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-800 dark:bg-gray-950 text-gray-300 dark:text-gray-400 py-10 px-4 sm:px-6 lg:px-8 mt-12 rounded-t-3xl shadow-lg border-t border-gray-700 dark:border-gray-800 relative"> {/* Añadido 'relative' aquí */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
        {/* Sección 1: Información de la Empresa */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <h3 className="text-3xl font-bold text-red-500 dark:text-red-400 mb-4 animate-pulse">
            Capriccio de Pizza
          </h3>
          <p className="text-sm leading-relaxed mb-4">
            Lo inimaginable en Gustos y Sabores!
          </p>
          <div className="flex space-x-4">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-500 transition-colors duration-300 transform hover:scale-110">
              <Facebook size={24} />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-gray-400 hover:text-pink-500 dark:hover:text-pink-400 transition-colors duration-300 transform hover:scale-110">
              <Instagram size={24} />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="text-gray-400 hover:text-blue-400 dark:hover:text-blue-300 transition-colors duration-300 transform hover:scale-110">
              <Twitter size={24} />
            </a>
          </div>
        </div>

        {/* Sección 2: Enlaces Rápidos */}
        <div className="text-center md:text-left">
          <h4 className="text-xl font-semibold text-white dark:text-gray-100 mb-4">Enlaces Rápidos</h4>
          <ul className="space-y-2">
            <li>
              <a href="#" className="text-gray-400 hover:text-red-400 transition-colors duration-300 text-sm">Inicio</a> {/* Añadido text-sm */}
            </li>
            <li>
              <a href="#" className="text-gray-400 hover:text-red-400 transition-colors duration-300 text-sm">Productos</a> {/* Añadido text-sm */}
            </li>
            <li>
              <a href="#" className="text-gray-400 hover:text-red-400 transition-colors duration-300 text-sm">Nuestras Sucursales</a> {/* Añadido text-sm */}
            </li>
            <li>
              <a href="#" className="text-gray-400 hover:text-red-400 transition-colors duration-300 text-sm">Preguntas Frecuentes</a> {/* Añadido text-sm */}
            </li>
          </ul>
        </div>

        {/* Sección 3: Contacto */}
        <div className="text-center md:text-left">
          <h4 className="text-xl font-semibold text-white dark:text-gray-100 mb-4">Contáctanos</h4>
          <ul className="space-y-2 text-sm"> {/* Añadido text-sm al ul */}
            <li className="flex items-center justify-center md:justify-start">
              <MapPin size={18} className="mr-2 text-red-400" />
              <span>Av. Monteverde 1181, Quilmes, Bs.As</span>
            </li>
            <li className="flex items-center justify-center md:justify-start">
              <Phone size={18} className="mr-2 text-red-400" />
              <span>+54 9 11 4914-9520</span>
            </li>
            <li className="flex items-center justify-center md:justify-start">
              <Mail size={18} className="mr-2 text-red-400" />
              <span>info@capricciodepizza.com</span>
            </li>
          </ul>
        </div>

        {/* Sección 4: Servicios Digitales / Agencia */}
        <div className="text-center md:text-left">
          <h4 className="text-xl font-semibold text-white dark:text-gray-100 mb-4">Servicios Digitales</h4>
          <p className="text-sm mb-4">
            ¿Necesitas una aplicación web o móvil a medida?
            <strong className="text-red-400"> Agencia Digital Powa</strong> te ayuda a crecer.
          </p>
          <button
            onClick={onOpenPowaContactForm} // Llama a la prop para abrir el modal/página
            className="inline-flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-md transition-colors duration-300 shadow-md focus:outline-none focus:ring-4 focus:ring-purple-300 group"
          >
            <Briefcase size={20} className="mr-2 group-hover:rotate-6 transition-transform duration-200" />
            Agenda tu Consulta
          </button>
        </div>
      </div>

      {/* Derechos de Autor */}
      <div className="border-t border-gray-700 dark:border-gray-800 mt-8 pt-6 text-center text-sm text-gray-500 dark:text-gray-500">
        &copy; {currentYear} Capriccio Pizza. Todos los derechos reservados.
      </div>

      {/* Botón de Admin Login (Camuflado y Pequeño) */}
      {userProfile && userProfile.role !== 'admin' && userProfile.id && ( // Muestra solo si NO es admin y hay un ID de usuario (incluso anónimo)
        <button
          onClick={onOpenAdminLogin}
          className="absolute bottom-4 right-4 text-xs text-gray-500 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-400 font-normal hover:underline transition-colors duration-200 flex items-center space-x-1"
          aria-label="Admin login"
          title="Acceso para Administradores" // Tooltip al pasar el ratón
        >
          <UserCheck size={14} className="inline-block" /> {/* Icono pequeño */}
          <span>Admin</span>
        </button>
      )}
    </footer>
  );
};

export default Footer;
