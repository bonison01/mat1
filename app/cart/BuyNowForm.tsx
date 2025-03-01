'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import "./Cart.css"

interface CartItem {
  id: number;
  name: string;
  price?: string;
  qty: number;
}

interface BuyNowFormProps {
  items: CartItem[];
  totalPrice: number;
  onClose: () => void;
  onOrderPlaced: (generatedOrderId: string) => void;
}

const BuyNowForm: React.FC<BuyNowFormProps> = ({ items, totalPrice, onClose, onOrderPlaced }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [showOrderIdPopup, setShowOrderIdPopup] = useState(false);
  const [totalCalculatedPrice, setTotalCalculatedPrice] = useState<number>(0);  // Store total calculated price
  const router = useRouter();

  useEffect(() => {
    // Calculate total price based on items and update the state
    const calculatedPrice = items.reduce((acc, item) => {
      const itemTotal = item.price ? parseFloat(item.price) * item.qty : 0;
      return acc + itemTotal;
    }, 0);
    setTotalCalculatedPrice(calculatedPrice);
  }, [items]);  // Recalculate total price when items change

  // Use totalPrice directly from props to display adjusted price
  const displayTotalPrice = totalPrice || totalCalculatedPrice;

  const generateOrderId = () => `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const generatedOrderId = generateOrderId();

    const fetchEmailsAndBusiness = async () => {
      const productIds = items.map((item) => item.id);
      const { data: products, error } = await supabase
        .from('products')
        .select('id, business_id, email')
        .in('id', productIds);

      if (error) {
        console.error('Error fetching related products and emails:', error);
        throw error;
      }
      return products;
    };

    try {
      const products = await fetchEmailsAndBusiness();
      const email = products[0]?.email || '';

      const orderData = {
        order_id: generatedOrderId,
        buyer_name: name,
        buyer_address: address,
        buyer_phone: phone,
        business_id: products[0]?.business_id || '',
        email,
        total_calculated_price: displayTotalPrice.toFixed(2),  // Store total_calculated_price instead of total_price
        item_list: items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price || 'N/A',
          quantity: item.qty,
          total: item.price ? (parseFloat(item.price) * item.qty).toFixed(2) : 'N/A',
        })),
      };

      // Insert order data into Supabase
      const { data, error } = await supabase.from('order_rec').insert(orderData);

      if (error) {
        console.error('Error submitting order:', error);
        throw error;
      }

      console.log('Order successfully placed:', data);
      console.log('Generated Order ID:', generatedOrderId);

      setOrderId(generatedOrderId);
      setShowOrderIdPopup(true);

      // Redirect to the order confirmation page
      router.push(`/order/${generatedOrderId}`);

      // Close the form
      onClose();
      onOrderPlaced(generatedOrderId);  // Trigger callback with order ID
    } catch (error: any) {
      console.error('Error during order submission:', error);
      alert(`Failed to submit order. Please try again. Error: ${error.message || error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerStyles: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '99vh',
  };

  const formStyles: React.CSSProperties = {
    background: '#1e1e1e',
    color: 'white',
    padding: '1.5rem',
    borderRadius: '0.5rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.6)',
    width: '24rem',
    height: "85vh",
    overflowY: "auto",
  };

  const inputStyles: React.CSSProperties = {
    background: '#333',
    color: 'white',
    border: '1px solid #555',
    borderRadius: '0.25rem',
    padding: '0.5rem',
    width: '100%',
  };

  const buttonStyles: React.CSSProperties = {
    background: '#1abc9c',
    color: 'white',
    padding: '0.75rem',
    borderRadius: '0.25rem',
    border: 'none',
    fontSize: '1rem',
    marginTop: '0.5rem',
    width: '100%',
    cursor: 'pointer',
    transition: 'background 0.3s',
  };

  const cancelButtonStyles: React.CSSProperties = {
    background: '#777',
    color: 'white',
    marginTop: '0.5rem',
    padding: '0.75rem',
    borderRadius: '0.25rem',
    border: 'none',
    fontSize: '1rem',
    width: '100%',
    cursor: 'pointer',
  };

  return (
    <div style={containerStyles}>
      <div style={formStyles} className='custom-scrollbar'>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Buy All Items
        </h2>
        <div style={{ marginBottom: '1rem' }}>
          {items.map((item) => (
            <div key={item.id} style={{ marginBottom: '1rem' }}>
              <p>
                <strong>Item:</strong> {item.name}
              </p>
              <p>
                <strong>Price:</strong> {item.price || 'N/A'}
              </p>
              <p>
                <strong>Quantity:</strong> {item.qty}
              </p>
              <p>
                <strong>Total:</strong>{' '}
                {item.price
                  ? `₹${(parseFloat(item.price) * item.qty).toFixed(2)}`
                  : 'N/A'}
              </p>
              <hr style={{ margin: '1rem 0', borderColor: '#444' }} />
            </div>
          ))}
        </div>

        {/* Display Total Price */}
        <p style={{ marginBottom: '1rem' }}>
          <strong>Total Price:</strong> ₹{displayTotalPrice.toFixed(2)}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyles}
              required
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="address">Address</label>
            <input
              type="text"
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={inputStyles}
              required
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="phone">Phone</label>
            <input
              type="text"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={inputStyles}
              required
            />
          </div>
          <button
            type="submit"
            style={{
              ...buttonStyles,
              opacity: isSubmitting ? 0.5 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
          <button type="button" onClick={onClose} style={cancelButtonStyles}>
            Cancel
          </button>
        </form>
      </div>

      {showOrderIdPopup && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#2ecc71',
            color: 'white',
            padding: '1rem',
            borderRadius: '0.5rem',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
            zIndex: 9999,
          }}
        >
          <p>Your Order ID: <strong>{orderId}</strong></p>
          <button onClick={() => setShowOrderIdPopup(false)} style={cancelButtonStyles}>
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default BuyNowForm;
