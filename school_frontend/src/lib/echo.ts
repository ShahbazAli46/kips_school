import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

if (typeof window !== 'undefined') {
  (window as any).Pusher = Pusher;
}

const getEcho = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://usachunian.com/api';
  const pusherKey = process.env.NEXT_PUBLIC_PUSHER_APP_KEY || 'a5c3493bb786a056bf4c';
  const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER || 'ap3';

  return new Echo({
    broadcaster: 'pusher',
    key: pusherKey,
    cluster: pusherCluster,
    forceTLS: true,
    authEndpoint: `${apiUrl}/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  });
};

export default getEcho;
