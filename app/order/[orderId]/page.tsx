'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

// Define the types for the order details
interface OrderItem {
  name: string;
  price: string;
  quantity: number;
}

interface OrderDetails {
  order_id: string;
  item_list: OrderItem[];
  total_calculated_price: string;  // Changed from adjustedTotalPrice to total_calculated_price
}

const OrderPage: React.FC = () => {
  const { orderId } = useParams();  // Access the `orderId` from the URL
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrderDetails = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        if (!response.ok) {
          const errorMessage = await response.text();
          throw new Error(errorMessage || 'Failed to fetch order details');
        }
        const data = await response.json();
        setOrderDetails(data);
      } catch (error: unknown) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('An unexpected error occurred');
        }
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  if (error) {
    return (
      <div style={{ color: 'white', backgroundColor: 'black', padding: '20px', textAlign: 'center' }}>
        {error}
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div style={{ color: 'white', backgroundColor: 'black', padding: '20px', textAlign: 'center' }}>
        Loading...
      </div>
    );
  }

  const { order_id, item_list, total_calculated_price } = orderDetails;

  return (
    <div style={{ backgroundColor: 'black', color: 'white', padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Order Details</h1>
      <div style={{ marginBottom: '1rem' }}>
        <strong>Order ID:</strong> {order_id}
      </div>

      <h2 style={{ marginBottom: '1rem' }}>Items:</h2>
      <div style={{ marginBottom: '1rem' }}>
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {/* Only map if item_list is an array */}
          {Array.isArray(item_list) && item_list.map((item, index) => (
            <li key={index} style={{ marginBottom: '0.5rem' }}>
              <strong>{item.name}</strong> - ₹{(parseFloat(item.price) * item.quantity).toFixed(2)} x {item.quantity}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ fontSize: '1.25rem', marginTop: '1rem' }}>
        <strong>Total amount including handling and delivery:</strong> ₹{total_calculated_price}
        <p>Our team will reach out to you soon.</p>
      </div>
    </div>
  );
};

export default OrderPage;
