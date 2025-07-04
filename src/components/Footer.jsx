import React from 'react';
import { Facebook, Instagram, Twitter, MapPin, Mail, Phone, Briefcase, UserCheck, Code } from 'lucide-react';

const Footer = ({ onOpenPowaContactForm, onOpenAdminLogin, userProfile }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-800 dark:bg-gray-950 text-gray-300 dark:text-gray-400 py-10 px-4 sm:px-6 lg:px-8 mt-12 rounded-t-3xl shadow-lg border-t border-gray-700 dark:border-gray-800 relative">
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
              <a href="#" className="text-gray-400 hover:text-red-400 transition-colors duration-300 text-sm">Inicio</a>
            </li>
            <li>
              <a href="#" className="text-gray-400 hover:text-red-400 transition-colors duration-300 text-sm">Productos</a>
            </li>
            <li>
              <a href="#" className="text-gray-400 hover:text-red-400 transition-colors duration-300 text-sm">Nuestras Sucursales</a>
            </li>
            <li>
              <a href="#" className="text-gray-400 hover:text-red-400 transition-colors duration-300 text-sm">Preguntas Frecuentes</a>
            </li>
          </ul>
        </div>

        {/* Sección 3: Contacto */}
        <div className="text-center md:text-left">
          <h4 className="text-xl font-semibold text-white dark:text-gray-100 mb-4">Contáctanos</h4>
          <ul className="space-y-2 text-sm">
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

        {/* Sección 4 (vacía o para otro contenido, ya que la agencia se movió) */}
        <div>
           {/* Aquí puedes poner 'Políticas de Privacidad', 'Términos de Servicio', etc. */}
        </div>

      </div>

      {/* Derechos de Autor */}
      <div className="border-t border-gray-700 dark:border-gray-800 mt-8 pt-6 text-center text-sm text-gray-500 dark:text-gray-500">
        &copy; {currentYear} Capriccio Pizza. Todos los derechos reservados.
      </div>

      {/* Agencia Digital Powa - Sutil y con descripción al pasar el mouse */}
      <div className="text-center mt-4 text-xs text-gray-600 dark:text-gray-700">
        {/* Este div es el 'group' que al hacer hover revelará el párrafo */}
        <a 
          href="https://agenciadigitalpowa.web.app/" // Reemplaza con la URL real de la agencia
          target="_blank" 
          rel="noopener noreferrer" 
          className="group inline-block cursor-pointer hover:text-gray-400 dark:hover:text-gray-500 transition-colors duration-200"
        >
          <div className="flex items-center justify-center"> {/* Contenedor para el icono y texto principal */}
            <Code size={14} className="mr-1" /> {/* Icono pequeño y sutil */}
            <span>Desarrollo Agencia Digital Powa</span> {/* Texto de la agencia */}
          </div>
          {/* El párrafo que aparece al pasar el mouse */}
          <p className="text-xs text-gray-500 dark:text-gray-600 mt-1
                        opacity-0 invisible transition-all duration-300 ease-in-out
                        group-hover:opacity-100 group-hover:visible group-hover:translate-y-0
                        -translate-y-2">
            Tu socio estratégico en desarrollo web y móvil.
          </p>
        </a>
      </div>

      {/* Botón de Admin Login (Camuflado y Pequeño) */}
      {userProfile && userProfile.role !== 'admin' && userProfile.id && (
        <button
          onClick={onOpenAdminLogin}
          className="absolute bottom-4 right-4 text-xs text-gray-500 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-400 font-normal hover:underline transition-colors duration-200 flex items-center space-x-1"
          aria-label="Admin login"
          title="Acceso para Administradores"
        >
          <UserCheck size={14} className="inline-block" />
          <span>Admin</span>
        </button>
      )}
    </footer>
  );
};

export default Footer;