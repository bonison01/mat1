'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import styles from '../Orders.module.css';

interface Product {
  id: number;
  user_id: string;
  name: string;
  description: string;
  price_inr: number;
  media_urls: string;
  category: string;
  user_name: string;
  discount_rate: number;
  discounted_price: number;
}

const Orders = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>(''); // State for search term
  const [categoryFilter, setCategoryFilter] = useState<string>(''); // State for category filter
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]); // State for filtered products

  // Fetch data from Supabase on mount
  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('new_products') // Updated table name
        .select('*');

      if (error) {
        console.error('Error fetching data:', error.message);
      } else {
        setProducts(data || []); // Ensure data is never null
        setFilteredProducts(data || []); // Initially show all products
      }
    };

    fetchProducts();
  }, []); // Empty dependency array means it runs once when the component mounts

  // Function to handle input change
  const handleInputChange = (productId: number, field: string, value: string) => {
    setProducts((prevProducts) =>
      prevProducts.map((product) =>
        product.id === productId ? { ...product, [field]: value } : product
      )
    );
  };

  // Function to handle save (update) for a particular product
  const handleSave = async (productId: number) => {
    const productToUpdate = products.find((product) => product.id === productId);
    if (!productToUpdate) return;

    const { data, error } = await supabase
      .from('new_products') // Updated table name
      .update({
        name: productToUpdate.name,
        description: productToUpdate.description,
        price_inr: productToUpdate.price_inr,
        discount_rate: productToUpdate.discount_rate,
        discounted_price: productToUpdate.discounted_price,
      })
      .eq('id', productId);

    if (error) {
      console.error('Error updating product:', error.message);
    } else {
      console.log('Product updated successfully:', data);
    }
  };

  // Function to handle search term change
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
  };

  // Function to handle category filter change
  const handleCategoryFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCategory = e.target.value;
    setCategoryFilter(selectedCategory);
  };

  // Function to filter products based on search term and category filter
  const getFilteredProducts = () => {
    return products.filter((product) => {
      const matchesSearchTerm =
        product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        categoryFilter === '' || product.category === categoryFilter; // If no category selected, show all
      return matchesSearchTerm && matchesCategory;
    });
  };

  useEffect(() => {
    // Whenever searchTerm or categoryFilter changes, filter the products
    setFilteredProducts(getFilteredProducts());
  }, [searchTerm, categoryFilter, products]);

  // Get unique categories for the dropdown
  const categories = Array.from(new Set(products.map((product) => product.category)));

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Product List</h1>

      {/* Search Input */}
      <div className={styles.searchContainer}>
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearch}
          placeholder="Search by name"
          className={styles.searchInput}
        />
      </div>

      {/* Category Filter Dropdown */}
      <div className={styles.categoryFilter}>
        <select
          value={categoryFilter}
          onChange={handleCategoryFilter}
          className={styles.categorySelect}
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {filteredProducts.length > 0 ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Description</th>
              <th>Price (INR)</th>
              <th>Media URLs</th>
              <th>Category</th>
              <th>User Name</th>
              <th>Discount Rate</th>
              <th>Discounted Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product.id}>
                <td>{product.id}</td>
                <td>
                  <input
                    type="text"
                    value={product.name || ''}
                    onChange={(e) =>
                      handleInputChange(product.id, 'name', e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={product.description || ''}
                    onChange={(e) =>
                      handleInputChange(product.id, 'description', e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={product.price_inr || ''}
                    onChange={(e) =>
                      handleInputChange(product.id, 'price_inr', e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={product.media_urls || ''}
                    onChange={(e) =>
                      handleInputChange(product.id, 'media_urls', e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={product.category || ''}
                    onChange={(e) =>
                      handleInputChange(product.id, 'category', e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={product.user_name || ''}
                    onChange={(e) =>
                      handleInputChange(product.id, 'user_name', e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={product.discount_rate || ''}
                    onChange={(e) =>
                      handleInputChange(product.id, 'discount_rate', e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={product.discounted_price || ''}
                    onChange={(e) =>
                      handleInputChange(product.id, 'discounted_price', e.target.value)
                    }
                  />
                </td>
                <td>
                  <button onClick={() => handleSave(product.id)}>Save</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No products available</p>
      )}
    </div>
  );
};

export default Orders;
