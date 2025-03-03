'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './Orders.module.css';

interface Order {
  id: number;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  buyer_name: string;
  buyer_address: string;
  buyer_phone: string;
  business_id: string;
  email: string;
  created_at: string;
  status: string;
  item_list: { id: number; name: string; price: number; total: number; quantity: number }[];
  total_price: number;
  total_calculated_price: number;
}

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  // Fetch data from Supabase on mount
  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('order_rec')
        .select('*');

      if (error) {
        console.error('Error fetching data:', error.message);
      } else {
        setOrders(data || []); // Ensure data is never null
      }
    };

    fetchOrders();
  }, []); // Empty dependency array means it runs once when the component mounts

  // Function to handle input change
  const handleInputChange = (orderId: number, field: string, value: string) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === orderId ? { ...order, [field]: value } : order
      )
    );
  };

  // Function to handle save (update) for a particular order
  const handleSave = async (orderId: number) => {
    const orderToUpdate = orders.find((order) => order.id === orderId);
    if (!orderToUpdate) return;

    const { data, error } = await supabase
      .from('order_rec')
      .update({
        quantity: orderToUpdate.quantity,
        status: orderToUpdate.status,
        buyer_name: orderToUpdate.buyer_name,
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order:', error.message);
    } else {
      console.log('Order updated successfully:', data);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Order List</h1>
      {orders.length > 0 ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Order ID</th>
              <th>Product ID</th>
              <th>Product Name</th>
              <th>Quantity</th>
              <th>Buyer Name</th>
              <th>Buyer Address</th>
              <th>Buyer Phone</th>
              <th>Business ID</th>
              <th>Email</th>
              <th>Created At</th>
              <th>Status</th>
              <th>Item List</th>
              <th>Total Price</th>
              <th>Total Calculated Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>{order.order_id}</td>
                <td>{order.product_id}</td>
                <td>{order.product_name}</td>

                {/* Editable Quantity */}
                <td>
                  <input
                    type="number"
                    value={order.quantity ?? ''}  // Use empty string if null
                    onChange={(e) =>
                      handleInputChange(order.id, 'quantity', e.target.value)
                    }
                  />
                  
                </td>

                {/* Editable Buyer Name */}
                <td>
                  <input
                    type="text"
                    value={order.buyer_name}
                    onChange={(e) =>
                      handleInputChange(order.id, 'buyer_name', e.target.value)
                    }
                  />
                </td>

                <td>{order.buyer_address}</td>
                <td>{order.buyer_phone}</td>
                <td>{order.business_id}</td>
                <td>{order.email}</td>
                <td>{new Date(order.created_at).toLocaleString()}</td>

                {/* Editable Status */}
                <td>
                  <select
                    value={order.status}
                    onChange={(e) =>
                      handleInputChange(order.id, 'status', e.target.value)
                    }
                  >
                    <option value="pending">Pending</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>

                {/* Item List */}
                <td>
                  {order.item_list.map((item) => (
                    <div key={item.id}>
                      <span>{item.name}</span> - 
                      <span>{item.quantity} x ${item.price}</span> = 
                      <span>${item.total}</span>
                    </div>
                  ))}
                </td>

                <td>{order.total_price}</td>
                <td>{order.total_calculated_price}</td>

                {/* Save Button */}
                <td>
                  <button onClick={() => handleSave(order.id)}>Save</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No orders available</p>
      )}
    </div>
  );
};

export default Orders;
