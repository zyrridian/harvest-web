"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Search,
  ShoppingCart,
  User,
  Package,
  Menu,
  X,
  Leaf,
  Bell,
  MessageSquare,
  LogOut,
  ChevronDown,
  MapPin,
  Users,
  Navigation,
} from "lucide-react";
import { useAuthStore } from "../client/store/auth.store";
import { useCartStore } from "../client/store/cart.store";

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  
  const { user, checkAuth, logout, isLoading } = useAuthStore();
  const { count: cartCount, fetchCount } = useCartStore();
  
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isAuthPage = pathname === "/login" || pathname === "/register";

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isAuthPage && user?.user_type === 'CONSUMER') {
      fetchCount();
    }
  }, [pathname, isAuthPage, user, fetchCount]);

  useEffect(() => {
    const handleCartUpdate = () => fetchCount();
    window.addEventListener("cartUpdated", handleCartUpdate);
    return () => window.removeEventListener("cartUpdated", handleCartUpdate);
  }, [fetchCount]);

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
    router.push("/login");
  };

  // Redirect farmers to their dashboard if they land here
  useEffect(() => {
    if (user?.user_type === "PRODUCER" && !isAuthPage && !isLoading) {
      router.push("/farmer/dashboard");
    }
  }, [user, isAuthPage, isLoading, router]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  const navItems = [
    { href: "/home", label: "Home", icon: Home },
    { href: "/products", label: "Products", icon: Package },
    { href: "/drop-points", label: "Drop Points", icon: Navigation },
    { href: "/farmers", label: "Farmers", icon: MapPin },
    { href: "/community", label: "Community", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/home" className="flex items-center gap-2">
              <Leaf size={24} className="text-accent" />
              <span className="text-lg font-bold tracking-tight text-heading">
                Harvest
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors ${
                    pathname === item.href ? 'text-accent' : 'text-body hover:text-accent-hover'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              {/* Search */}
              <Link
                href="/search"
                className="p-2 rounded transition-colors hover:bg-stone-100 text-body"
              >
                <Search size={20} />
              </Link>

              {user ? (
                <>
                  {/* Notifications */}
                  <Link
                    href="/notifications"
                    className="hidden sm:block p-2 rounded transition-colors hover:bg-stone-100 text-body"
                  >
                    <Bell size={20} />
                  </Link>

                  {/* Cart */}
                  <Link
                    href="/cart"
                    className="relative p-2 rounded transition-colors hover:bg-stone-100 text-body"
                  >
                    <ShoppingCart size={20} />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs font-medium text-white bg-accent rounded-full">
                        {cartCount > 9 ? "9+" : cartCount}
                      </span>
                    )}
                  </Link>

                  {/* User Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-2 p-2 rounded transition-colors hover:bg-stone-100"
                    >
                      <div className="w-8 h-8 flex items-center justify-center text-sm font-medium bg-success-bg text-accent rounded-full">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <ChevronDown size={16} className="hidden sm:block text-body" />
                    </button>

                    {showUserMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowUserMenu(false)}
                        />
                        <div className="absolute right-0 top-full mt-2 w-56 z-50 border rounded bg-white border-border py-2 shadow-lg">
                          <div className="px-4 py-2 border-b border-border">
                            <p className="text-sm font-medium text-heading">
                              {user.name}
                            </p>
                            <p className="text-xs text-body">
                              {user.email}
                            </p>
                          </div>
                          <Link
                            href="/profile"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-stone-50 text-body"
                          >
                            <User size={16} />
                            My Profile
                          </Link>
                          <Link
                            href="/orders"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-stone-50 text-body"
                          >
                            <Package size={16} />
                            My Orders
                          </Link>
                          <Link
                            href="/messages"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-stone-50 text-body"
                          >
                            <MessageSquare size={16} />
                            Messages
                          </Link>
                          <div className="border-t border-border my-1" />
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-2 text-sm w-full transition-colors hover:bg-stone-50 text-error"
                          >
                            <LogOut size={16} />
                            Sign Out
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="px-4 py-2 text-sm font-medium transition-colors text-body hover:text-accent"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-2 text-sm font-medium transition-colors bg-accent text-white rounded hover:bg-accent-hover"
                  >
                    Sign Up
                  </Link>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 rounded transition-colors hover:bg-stone-100 text-body"
              >
                {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {showMobileMenu && (
            <div className="md:hidden border-t border-border py-4">
              <nav className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMobileMenu(false)}
                    className={`flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors rounded ${
                      pathname === item.href
                        ? 'text-accent bg-success-bg'
                        : 'text-body hover:bg-stone-50'
                    }`}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>

      {/* Mobile Bottom Navigation */}
      {user && (
        <>
          <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-white border-border">
            <div className="flex items-center justify-around h-16">
              {[
                { href: "/home", icon: Home, label: "Home" },
                { href: "/products", icon: Search, label: "Browse" },
                { href: "/drop-points", icon: Navigation, label: "Map" },
                {
                  href: "/cart",
                  icon: ShoppingCart,
                  label: "Cart",
                  badge: cartCount,
                },
                { href: "/profile", icon: User, label: "Profile" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative flex flex-col items-center gap-1 py-2 px-3"
                >
                  <item.icon
                    size={20}
                    className={pathname === item.href ? 'text-accent' : 'text-body'}
                  />
                  <span className={`text-[10px] ${pathname === item.href ? 'text-accent font-medium' : 'text-body'}`}>
                    {item.label}
                  </span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center text-[10px] font-medium text-white bg-accent rounded-full">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </nav>
          {/* Bottom padding for mobile nav */}
          <div className="h-16 md:hidden" />
        </>
      )}
    </div>
  );
}
