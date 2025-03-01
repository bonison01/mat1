'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import styles from './ProductUploadPage.module.css';

interface User {
  user_id: string;
  email: string;
  phone: string;
  whatsapp: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  price_inr: number;
  media_urls: string[];
  discounted_price?: number; // Optional field for discounted price
}

export default function ProductUploadPage() {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productMedia, setProductMedia] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<{ url: string; loading: boolean }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [updatedName, setUpdatedName] = useState('');
  const [updatedDescription, setUpdatedDescription] = useState('');
  const [updatedPrice, setUpdatedPrice] = useState('');
  const [updatedMedia, setUpdatedMedia] = useState<File[]>([]);
  const [editMediaPreviews, setEditMediaPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('');  // New state for category
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [discountRate, setDiscountRate] = useState<number>(0); // New state for discount rate
const [discountedPrice, setDiscountedPrice] = useState<number>(); // New state for discounted price


  useEffect(() => {
    const fetchUser = async () => {
      const sessionUser = JSON.parse(sessionStorage.getItem('user') || '{}');
      if (sessionUser?.email) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('user_id, email, phone, whatsapp')
          .eq('email', sessionUser.email)
          .single();

        if (userError || !userData) {
          setError('Failed to fetch user data. Please log in again.');
        } else {
          setUser(userData);
          fetchProducts(userData.user_id);
        }
      } else {
        setError('User not logged in. Please log in first.');
      }
    };

    fetchUser();
  }, []);

  const fetchProducts = async (userId: string) => {
    const { data: productsData, error: productsError } = await supabase
      .from('new_products')
      .select('*')
      .eq('user_id', userId);

    if (productsError) {
      setError('Failed to fetch products.');
    } else {
      setProducts(productsData || []);
    }
  };
  const handleDiscountRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rate = parseFloat(e.target.value);
    setDiscountRate(rate);
    setDiscountedPrice(productPrice ? parseFloat(productPrice) * (1 - rate / 100) : 0);
  };
  
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const price = e.target.value;
    setProductPrice(price);
    setDiscountedPrice(price ? parseFloat(price) * (1 - discountRate / 100) : 0);
  };
  

  const handleDelete = async (productId: number) => {
    if (!user) {
      setError('User information is missing. Please log in again.');
      return;
    }
  
    const confirmDelete = window.confirm('Are you sure you want to delete this product?');
    if (!confirmDelete) return;
  
    setError(null);
    setSuccessMessage(null);
  
    try {
      // Delete the product from the database
      const { error: deleteError } = await supabase
        .from('new_products')
        .delete()
        .eq('id', productId)
        .eq('user_id', user.user_id);
  
      if (deleteError) throw new Error('Failed to delete product.');
  
      setSuccessMessage('Product deleted successfully!');
      fetchProducts(user.user_id); // Re-fetch products after deletion
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    }
  };
  
  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);

      if (isEdit) {
        setUpdatedMedia(files);
        const previews = files.map((file) => URL.createObjectURL(file));
        setEditMediaPreviews(previews);
      } else {
        setProductMedia(files);
        const previews = files.map(() => ({ url: '', loading: true }));
        setMediaPreviews(previews);

        files.forEach((file, index) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            setMediaPreviews((prev) => {
              const updatedPreviews = [...prev];
              updatedPreviews[index] = { url: reader.result as string, loading: false };
              return updatedPreviews;
            });
          };
          reader.readAsDataURL(file);
        });
      }
    }
  };

  const uploadMediaFiles = async (files: File[], userId: string) => {
    const mediaUrls: string[] = [];

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('product-media')
        .upload(`media/${fileName}`, file);

      if (error) throw new Error('Error uploading media files.');

      const { publicUrl } = supabase.storage
        .from('product-media')
        .getPublicUrl(`media/${fileName}`).data;

      if (publicUrl) mediaUrls.push(publicUrl);
    }

    return mediaUrls;
  };

  const handleUpload = async () => {
    if (!user) {
      setError('User information is missing. Please log in again.');
      return;
    }
  
    setUploading(true);
    setError(null);
    setSuccessMessage(null);
  
    try {
      // Fetch the user's name from the 'users' table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('name')
        .eq('user_id', user.user_id)
        .single();
  
      if (userError || !userData) {
        throw new Error('Failed to fetch user name.');
      }
  
      // Get the user's name
      const userName = userData.name;
  
      // If productPrice is provided, use it. If not, default to 0.
      const priceInr = productPrice ? parseFloat(productPrice) : 0;
  
      // If media is provided, upload it; otherwise, use an empty array.
      const mediaUrls = productMedia.length > 0 ? await uploadMediaFiles(productMedia, user.user_id) : [];
  
      // Insert product data into the 'new_products' table
      const { error: dbError } = await supabase
        .from('new_products')
        .insert({
          user_id: user.user_id,
          user_name: userName,
          name: productName || '', // Product name is optional
          description: productDescription || '', // Product description is optional
          price_inr: priceInr,
          media_urls: mediaUrls,
          category: category || '', // Category is optional
          discount_rate: discountRate, // Store the discount rate
          discounted_price: discountedPrice, // Store the discounted price
        });
  
      if (dbError) throw new Error('Failed to save product.');
  
      setSuccessMessage('Product uploaded successfully!');
      setProductName('');
      setProductDescription('');
      setProductPrice('');
      setProductMedia([]);
      setMediaPreviews([]);
      setDiscountRate(0);
      setDiscountedPrice(0);
      setCategory('');
      fetchProducts(user.user_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setUploading(false);
    }
  };
        
  const handleEdit = (product: Product) => {
    setEditingProductId(product.id);
    setUpdatedName(product.name);
    setUpdatedDescription(product.description);
    setUpdatedPrice(product.price_inr.toString());
    setEditMediaPreviews(product.media_urls);
    setUpdatedMedia([]);
    setCategory(product.category); // Set the category to the current product's category
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
    setUpdatedName('');
    setUpdatedDescription('');
    setUpdatedPrice('');
    setUpdatedMedia([]);
    setEditMediaPreviews([]);
  };

  const handleSaveChanges = async () => {
    if (!editingProductId || !updatedName || !updatedDescription || !updatedPrice) {
      setError('All fields are required.');
      return;
    }
  
    setError(null);
    setSuccessMessage(null);
  
    try {
      const mediaUrls = updatedMedia.length > 0
        ? await uploadMediaFiles(updatedMedia, user?.user_id || '')
        : editMediaPreviews;
  
      const updatedProductData = {
        name: updatedName,
        description: updatedDescription,
        price_inr: parseFloat(updatedPrice),
        media_urls: mediaUrls,
        category: category,
        discounted_price: discountedPrice || null,  // Use the updated discounted price
      };
  
      const { error: updateError } = await supabase
        .from('new_products')
        .update(updatedProductData)
        .eq('id', editingProductId);
  
      if (updateError) throw new Error('Failed to update product.');
  
      setSuccessMessage('Product updated successfully!');
      handleCancelEdit();
      fetchProducts(user?.user_id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    }
  };
    return (
    <div className={styles.container}>
      <h1 className={styles.title}>Upload Product</h1>

      {error && <p className={styles.error}>{error}</p>}
      {successMessage && <p className={styles.success}>{successMessage}</p>}

      <div>
        {/* Upload Form */}
        <div className={styles.formGroup}>
          <label htmlFor="productName">Product Name</label>
          <input
            id="productName"
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="productDescription">Product Description</label>
          <textarea
            id="productDescription"
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            className={styles.textarea}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="productPrice">Product Price (INR)</label>
          <input
            id="productPrice"
            type="number"
            value={productPrice}
            onChange={(e) => setProductPrice(e.target.value)}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
  <label htmlFor="discountRate">Discount Rate (%)</label>
  <input
    id="discountRate"
    type="number"
    value={discountRate}
    onChange={handleDiscountRateChange}
    className={styles.input}
  />
</div>

<div className={styles.formGroup}>
        <label htmlFor="updatedDiscountedPrice">Discounted Price (INR)</label>
        <input
          id="updatedDiscountedPrice"
          type="number"
          value={discountedPrice}
          onChange={(e) => setDiscountedPrice(parseFloat(e.target.value))}
          className={styles.input}
        />
      </div>


        <div className={styles.formGroup}>
          <label htmlFor="productMedia">Product Images/Videos</label>
          <input
            id="productMedia"
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleMediaChange}
            className={styles.fileInput}
          />
          <div className={styles.previews}>
            {mediaPreviews.map((preview, index) => (
              <div key={index} className={styles.preview}>
                {preview.loading ? (
                  <div>Loading...</div>
                ) : (
                  <img src={preview.url} alt={`Preview ${index}`} className={styles.thumbnail} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.formGroup}>
  <label htmlFor="productCategory">Product Category</label>
  <select
    id="productCategory"
    value={category}
    onChange={(e) => setCategory(e.target.value)}
    className={styles.select}
  >
    <option value="">Select a category</option>
    <option value="Grocery">Grocery</option>
    <option value="Instant Foods">Instant Foods</option>
    <option value="Snacks">Snacks</option>
    <option value="Soft Drinks and Juices">Soft Drinks and Juices</option>
    <option value="Books & Stationary">Books & Stationary</option>
    <option value="Personal Hygiene and Health">Personal Hygiene and Health</option>
    <option value="Electronics">Electronics</option>
    <option value="Fashion">Fashion</option>
    <option value="Furniture">Furniture</option>
    <option value="Others">Others</option>
    {/* Add more categories here */}
  </select>
</div>


        <button onClick={handleUpload} disabled={uploading} className={styles.uploadButton}>
          {uploading ? 'Uploading...' : 'Upload Product'}
        </button>
      </div>

      <h2 className={styles.productListTitle}>Your Products</h2>
      <div className={styles.productList}>
        {products.map((product) => (
          <div key={product.id} className={styles.productCard}>
            <h3>{product.name}</h3>
            <p>{product.description}</p>
            <p>Category: {product.category}</p> {/* Display the category here */}
            <p>Price: ₹{product.price_inr}</p>
            <div className={styles.thumbnailList}>
              {product.media_urls.slice(0, 3).map((url, index) => (
                <img key={index} src={url} alt={`Product ${product.id}`} className={styles.thumbnail} />
              ))}
            </div>
            <div>
              {product.discounted_price !== undefined && product.discounted_price > 0 && (
                <p>Discounted Price: ₹{product.discounted_price.toFixed(2)}</p>
              )}
            </div>


            <div>
              <button onClick={() => handleEdit(product)} className={styles.editButton}>
                Edit
              </button>
              <button onClick={() => handleDelete(product.id)} className={styles.deleteButton}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>


      {/* Edit Modal */}
{/* Edit Modal */}
{editingProductId && (
  <div className={styles.editModalOverlay}>
    <div className={styles.editModal}>
      <h3>Edit Product</h3>
      <div className={styles.formGroup}>
        <label htmlFor="updatedName">Product Name</label>
        <input
          id="updatedName"
          type="text"
          value={updatedName}
          onChange={(e) => setUpdatedName(e.target.value)}
          className={styles.input}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="updatedDescription">Product Description</label>
        <textarea
          id="updatedDescription"
          value={updatedDescription}
          onChange={(e) => setUpdatedDescription(e.target.value)}
          className={styles.textarea}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="updatedPrice">Product Price (INR)</label>
        <input
          id="updatedPrice"
          type="number"
          value={updatedPrice}
          onChange={(e) => setUpdatedPrice(e.target.value)}
          className={styles.input}
        />
      </div>

      {/* Discounted Price Editable */}
      <div className={styles.formGroup}>
        <label htmlFor="updatedDiscountedPrice">Discounted Price (INR)</label>
        <input
          id="updatedDiscountedPrice"
          type="number"
          value={discountedPrice}
          onChange={(e) => setDiscountedPrice(parseFloat(e.target.value))}
          className={styles.input}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="updatedMedia">Update Images/Videos</label>
        <input
          id="updatedMedia"
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => handleMediaChange(e, true)}
          className={styles.fileInput}
        />
        <div className={styles.previews}>
          {editMediaPreviews.map((url, index) => (
            <div key={index} className={styles.preview}>
              <img
                src={url}
                alt={`Edit Preview ${index}`}
                className={styles.thumbnail}
              />
            </div>
          ))}
          {updatedMedia.map((file, index) => (
            <div key={index} className={styles.preview}>New</div>
          ))}
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="productCategory">Product Category</label>
        <select
          id="productCategory"
          value={category}
          onChange={(e) => setCategory(e.target.value)} // Handle category change
          className={styles.select}
        >
          <option value="">Select a category</option>
          <option value="Grocery">Grocery</option>
          <option value="Instant Foods">Instant Foods</option>
          <option value="Snacks">Snacks</option>
          <option value="Soft Drinks and Juices">Soft Drinks and Juices</option>
          <option value="Books & Stationary">Books & Stationary</option>
          <option value="Personal Hygiene and Health">Personal Hygiene and Health</option>
          <option value="Electronics">Electronics</option>
          <option value="Fashion">Fashion</option>
          <option value="Furniture">Furniture</option>
          <option value="Others">Others</option>
          {/* Add more categories here */}
        </select>
      </div>

      <button onClick={handleSaveChanges} className={styles.saveButton}>
        Save Changes
      </button>
      <button onClick={handleCancelEdit} className={styles.cancelButton}>
        Cancel
      </button>
    </div>
  </div>
)}
    </div>
  );
}