import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Menu, X, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from './Logo';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useShopCart } from '@/context/ShopCartContext';
import { DevLocationToggle } from './DevLocationToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  variant?: 'default' | 'landing';
}

export function Header({ variant = 'default' }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, profile, logout } = useAuth();
  const { getTotalItemCount } = useCart();
  const { getTotalItemCount: getShopTotalItemCount } = useShopCart();
  const navigate = useNavigate();
  const location = useLocation();
  const itemCount = getTotalItemCount();
  const shopItemCount = getShopTotalItemCount();
  
  // Check if user is browsing shop-related pages
  const isShopPage = location.pathname.startsWith('/shop') || location.pathname.startsWith('/shops');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className={`sticky top-0 z-50 backdrop-blur-sm border-b shadow-card ${
      variant === 'landing' 
        ? 'bg-mcd-cream border-mcd-border' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-[72px] md:h-24">
          <Logo />

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {user && profile ? (
              <>
                {profile.role === 'student' && (
                  <>
                    <Link 
                      to="/student/dashboard" 
                      className="text-mcd-text hover:text-mcd-red transition-colors font-medium"
                    >
                      Browse
                    </Link>
                    <Link 
                      to="/student/orders" 
                      className="text-mcd-text hover:text-mcd-red transition-colors font-medium"
                    >
                      My Orders
                    </Link>
                  </>
                )}
                {profile.role === 'vendor' && (
                  <>
                    <Link 
                      to="/vendor/dashboard" 
                      className="text-mcd-text hover:text-mcd-red transition-colors font-medium"
                    >
                      Orders
                    </Link>
                    <Link 
                      to="/vendor/menu" 
                      className="text-mcd-text hover:text-mcd-red transition-colors font-medium"
                    >
                      Menu
                    </Link>
                  </>
                )}
              </>
            ) : (
              <>
                <Link 
                  to="/auth" 
                  className="text-mcd-text hover:text-mcd-red transition-colors font-medium"
                >
                  Login
                </Link>
              </>
            )}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Shop Cart Icon - shows when on shop pages with items */}
            {isShopPage && shopItemCount > 0 && (
              <Link to="/shop/cart">
                <Button variant="ghost" size="icon" className="relative bg-mcd-selected hover:bg-mcd-yellow/30 h-11 w-11 md:h-10 md:w-10 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0">
                  <ShoppingCart className="h-6 w-6 md:h-5 md:w-5 text-mcd-red" strokeWidth={2.25} />
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-mcd-red text-white text-xs font-bold rounded-full flex items-center justify-center animate-scale-in">
                    {shopItemCount}
                  </span>
                </Button>
              </Link>
            )}
            
            {user && profile?.role === 'student' && (
              <Link to="/student/carts" className="relative">
                <Button variant="ghost" size="icon" className="relative bg-mcd-selected hover:bg-mcd-yellow/30 h-11 w-11 md:h-10 md:w-10 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0">
                  <ShoppingCart className="h-6 w-6 md:h-5 md:w-5 text-mcd-red" strokeWidth={2.25} />
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-mcd-red text-white text-xs font-bold rounded-full flex items-center justify-center animate-scale-in">
                      {itemCount}
                    </span>
                  )}
                </Button>
              </Link>
            )}

            {user && profile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hidden md:flex bg-mcd-selected hover:bg-mcd-yellow/30">
                    <User className="h-5 w-5 text-mcd-red" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-mcd-cream border-mcd-border">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-bold text-mcd-text">{profile.name}</p>
                    <p className="text-xs text-mcd-text/70">{profile.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-mcd-border" />
                  <DropdownMenuItem onClick={handleLogout} className="text-mcd-red cursor-pointer hover:bg-mcd-selected">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {!user && (
              <Button asChild className="hidden md:flex bg-mcd-yellow hover:bg-mcd-yellow/90 text-mcd-text font-bold border-0">
                <Link to="/auth">Get Started</Link>
              </Button>
            )}

            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden bg-mcd-selected hover:bg-mcd-yellow/30 h-11 w-11 min-h-[44px] min-w-[44px]"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6 text-mcd-red" strokeWidth={2.25} /> : <Menu className="h-6 w-6 text-mcd-red" strokeWidth={2.25} />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-mcd-border animate-fade-up">
            <nav className="flex flex-col gap-3">
              {user && profile ? (
                <>
                  {profile.role === 'student' && (
                    <>
                      <Link 
                        to="/student/dashboard" 
                        className="px-4 py-2 text-mcd-text hover:bg-mcd-selected rounded-lg transition-colors font-medium"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Browse Canteens
                      </Link>
                      <Link 
                        to="/student/orders" 
                        className="px-4 py-2 text-mcd-text hover:bg-mcd-selected rounded-lg transition-colors font-medium"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        My Orders
                      </Link>
                      <Link 
                        to="/student/carts" 
                        className="px-4 py-2 text-mcd-text hover:bg-mcd-selected rounded-lg transition-colors font-medium"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        My Carts {itemCount > 0 && `(${itemCount})`}
                      </Link>
                    </>
                  )}
                  {profile.role === 'vendor' && (
                    <>
                      <Link 
                        to="/vendor/dashboard" 
                        className="px-4 py-2 text-mcd-text hover:bg-mcd-selected rounded-lg transition-colors font-medium"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Orders
                      </Link>
                      <Link 
                        to="/vendor/menu" 
                        className="px-4 py-2 text-mcd-text hover:bg-mcd-selected rounded-lg transition-colors font-medium"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Menu Management
                      </Link>
                    </>
                  )}
                  <button 
                    className="px-4 py-2 text-left text-mcd-red hover:bg-mcd-selected rounded-lg transition-colors font-medium"
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    to="/auth" 
                    className="px-4 py-2 text-mcd-text hover:bg-mcd-selected rounded-lg transition-colors font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login / Sign Up
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>

      {/* Developer-only location toggle - only visible when TEST_MODE = true */}
      <DevLocationToggle />
    </header>
  );
}
