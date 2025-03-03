'use client'; // Ensure this is at the top to mark it as a client component

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { useCart } from '../../business/context/CartContext';
import styles from './AllProductsPage.module.css';

interface Product {
  id: number;
  user_id: string;
  user_name: string;
  name: string;
  description: string;
  media_urls: string[];
  phone?: string;
  whatsapp?: string;
  price_inr: string;
  price?: string;
  category?: string;
  discounted_price: string;
}

const AllProductMediaPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryWiseProducts, setCategoryWiseProducts] = useState<{ [key: string]: Product[] }>({});

  const router = useRouter();
  const { addToCart } = useCart();

  const predefinedCategories = [
    "Grocery",
    "Instant Foods",
    "Snacks",
    "Soft Drinks and Juices",
    "Books & Stationary",
    "Personal Hygiene and Health",
    "Electronics",
    "Fashion",
    "Furniture",
    "Others"
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase.from('new_products').select('*');
        if (error) throw new Error(error.message);
        setProducts(data || []);

        // Filter categories based on predefined categories list
        const allCategories = predefinedCategories.filter((category) => data?.some((product) => product.category === category));
        setCategories(allCategories);

        // Group products by category based on predefined categories
        const groupedByCategory = predefinedCategories.reduce((acc: { [key: string]: Product[] }, category) => {
          const categoryProducts = data?.filter((product) => product.category === category) || [];
          if (categoryProducts.length > 0) {
            acc[category] = categoryProducts;
          }
          return acc;
        }, {});
        setCategoryWiseProducts(groupedByCategory);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleBuyNow = (product: Product) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      qty: 1,
    });
    router.push('/cart');
  };

  const handleAddToCart = (product: Product) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price || 'N/A',
      qty: 1,
    });
    setSelectedProduct(product);
  };

  const handleCall = (phone?: string) => {
    if (phone) window.open(`tel:${phone}`, '_self');
  };

  const handleWhatsApp = (whatsapp?: string) => {
    if (whatsapp) window.open(whatsapp, '_blank');
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const openModal = (product: Product) => {
    setSelectedProduct(product);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedProduct(null);
  };

  if (loading) return <p className={styles.loading}>Loading...</p>;

  if (error) return <p className={styles.error}>{error}</p>;

  return (
    <div className={styles.exploreContainer}>
      <div className="flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl font-bold text-white-800 md:text-6xl">Explore Products</h1>
        <h2 className="text-2xl text-white-200 md:text-1xl mt-2">The buying options will be available starting 2nd March 2025.</h2>

        <button
          className="mt-6 inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-white hover:text-green-600"
          onClick={() => router.push('/discover')}
        >
          Explore Sellers
        </button>
      </div>

      {/* Category Filter */}
      <div className={styles.categoryButtons}>
        <div className="hidden md:block">
          {predefinedCategories.map((category, index) => (
            <button
              key={index}
              className={`${styles.categoryButton} ${selectedCategory === category ? styles.selected : ''}`}
              onClick={() => {
                setSelectedCategory(category);
              }}
            >
              {category}
            </button>
          ))}
          <button
            className={`${styles.categoryButton} ${!selectedCategory ? styles.selected : ''}`}
            onClick={() => {
              setSelectedCategory(null);
            }}
          >
            All Categories
          </button>
        </div>

        {/* Mobile Dropdown */}
        <div className="md:hidden">
          <select
            className={styles.categoryDropdown}
            value={selectedCategory || ''}
            onChange={(e) => {
              const category = e.target.value;
              setSelectedCategory(category || null);
            }}
          >
            <option value="">All Categories</option>
            {predefinedCategories.map((category, index) => (
              <option key={index} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search Bar */}
      <div className={styles.searchBar}>
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearch}
          placeholder="Search products..."
          className={styles.searchInput}
        />
      </div>

      <a
        href="/cart"
        className="text-2xl font-bold mb-5 text-black-500 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        My carts🛒
      </a>

      {/* Render Products Category-wise */}
      {predefinedCategories.map((category) => {
        if (selectedCategory && selectedCategory !== category) return null; // Filter categories based on selection

        const categoryProducts = categoryWiseProducts[category] || [];

        return categoryProducts.length > 0 ? (
          <div key={category} className={styles.categorySection}>
            <h2 className={styles.categoryTitle}>{category}</h2>
            <div className={styles.productList}>
              {categoryProducts.map((product) => (
                <div key={product.id} className={styles.mediaItem}>
                  <div onClick={() => openModal(product)} className={styles.mediaContentWrapper}>
                    {product.media_urls.map((url, index) => {
                      const isVideo = /\.(mp4|webm|ogg)$/i.test(url);
                      return isVideo ? (
                        <video key={index} src={url} autoPlay loop muted playsInline className={styles.mediaContent}></video>
                      ) : (
                        <img key={index} src={url} alt={`Product ${product.id}`} className={styles.mediaContent} />
                      );
                    })}
                  </div>
                  <div>
                    <div className={styles.productInfo}>
                    <h2 style={{ fontWeight: 'bold' }}>{product.name}</h2>
                    <h3 style={{ fontSize: '0.475rem', color: '#555' }}>{product.description}</h3>

                      <h3 className="text-sm mb-1 line-through">MRP:{product.price_inr}</h3>
                      <h4 className="text-sm mb-1">Discount Price: Rs. {product.discounted_price}</h4>
                    </div>
                    <div className={styles.actionIcons}>
                      {product.phone && (
                        <button className={styles.callIcon} onClick={() => handleCall(product.phone)} aria-label="Call">
                          📞
                        </button>
                      )}
                      {product.whatsapp && (
                        <button
                          className={styles.whatsappIcon}
                          onClick={() => handleWhatsApp(product.whatsapp)}
                          aria-label="WhatsApp"
                        >
                          💬
                        </button>
                      )}
                      <button className={styles.infoButton} onClick={() => openModal(product)} aria-label="More Info">
                        ℹ️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null;
      })}

      {showModal && selectedProduct && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button onClick={closeModal} className={styles.closeButton}>
              ✖️
            </button>
            <h2 className={styles.productName}>{selectedProduct.name}</h2>
            <h2 className={styles.productName}>{selectedProduct.price}</h2>
            <h2 className={styles.productName}>{selectedProduct.description}</h2>
            <p className={styles.productCategory}>Category: {selectedProduct.category || 'N/A'}</p>
            <div className={styles.modalMedia}>
              {selectedProduct.media_urls.map((url, index) => {
                const isVideo = /\.(mp4|webm|ogg)$/i.test(url);
                return isVideo ? (
                  <video key={index} src={url} controls className={styles.modalMediaContent}></video>
                ) : (
                  <img key={index} src={url} alt={`Product ${selectedProduct.id}`} className={styles.modalMediaContent} />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="fixed bottom-4 right-4">
          <button
            onClick={() => {
              handleAddToCart(selectedProduct);
              router.push('/cart');
            }}
            className="bg-yellow-500 text-white p-3 rounded-full shadow-lg hover:bg-yellow-600"
            aria-label="Add to Cart"
          >
            🛒
          </button>
        </div>
      )}
    </div>
  );
};

export default AllProductMediaPage;
