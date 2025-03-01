'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiMenu } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './styles/GlobalHeader.module.css';

const Header: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isEmployeeLoggedIn, setIsEmployeeLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const updateLoginStatus = () => {
      const userJson = sessionStorage.getItem('user');
      const employeeJson = sessionStorage.getItem('employee');
      setIsLoggedIn(!!userJson);
      setIsEmployeeLoggedIn(!!employeeJson);
    };

    // Initial check
    updateLoginStatus();

    // Listen for custom login status change event
    window.addEventListener('loginStatusChange', updateLoginStatus);

    return () => {
      window.removeEventListener('loginStatusChange', updateLoginStatus);
    };
  }, []);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const handleLogout = () => {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('employee');
    setIsLoggedIn(false);
    setIsEmployeeLoggedIn(false);

    // Emit the event
    window.dispatchEvent(new Event('loginStatusChange'));

    router.push('/');
  };

  return (
    <header className={styles.header}>
      {/* Logo Section */}
      <div className={styles.logo}>
        <Link href="/home" passHref>
          <Image src="/logo.png" alt="Logo" width={50} height={50} className={styles.logoImage} />
        </Link>
      </div>

      {/* Hamburger Menu Button for Mobile */}
      <button className={styles.menuButton} onClick={toggleMenu} aria-label="Toggle menu">
        <FiMenu className={styles.icon} />
      </button>

      {/* Navigation Menu */}
      <nav className={`${styles.nav} ${menuOpen ? styles.open : ''}`}>
        
        {/* Conditional Rendering for Logged In Users or Employees */}
        {isLoggedIn && !isEmployeeLoggedIn && (
          <>
            <Link href="/discover" className={styles.navButton} onClick={() => setMenuOpen(false)}>
              Discover
            </Link>
            <Link href="/book" className={styles.navButton} onClick={() => setMenuOpen(false)}>
              Delivery Rates
            </Link>
            <Link href="/delivery_orders" className={styles.navButton} onClick={() => setMenuOpen(false)}>
              Delivery Orders
            </Link>
            <Link href="/profile" className={styles.navButton} onClick={() => setMenuOpen(false)}>
              Profile
            </Link>
            <button onClick={handleLogout} className={styles.logoutButton}>
              Log Out
            </button>
          </>
        )}

        {isEmployeeLoggedIn && (
          <>
            <Link href="/employee-dashboard" className={styles.navButton} onClick={() => setMenuOpen(false)}>
              Employee Dashboard
            </Link>
            <Link href="/employee-dashboard" className={styles.navButton} onClick={() => setMenuOpen(false)}>
              Order Entry
            </Link>
            <Link href="/orders" className={styles.navButton} onClick={() => setMenuOpen(false)}>
              Orders
            </Link>
            <button onClick={handleLogout} className={styles.logoutButton}>
              Employee Logout
            </button>
          </>
        )}

        {/* For non-logged in users */}
        {!isLoggedIn && !isEmployeeLoggedIn && (
          <>
            <Link href="/discover" className={styles.navButton} onClick={() => setMenuOpen(false)}>
              Discover
            </Link>
            <Link href="/book" className={styles.navButton} onClick={() => setMenuOpen(false)}>
              Delivery Rates
            </Link>
            <Link href="/searchOrders" className={styles.navButton} onClick={() => setMenuOpen(false)}>
              Search Order
            </Link>
            <Link href="/login" className={styles.navButton} onClick={() => setMenuOpen(false)}>
              Log In
            </Link>
          </>
        )}
      </nav>
    </header>
  );
};

export default Header;
