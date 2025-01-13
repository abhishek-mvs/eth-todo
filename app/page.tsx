import Todo from './components/todo';
import Footer from './components/footer';

export default function Home() {  

  return (
    <div className="bg-gradient-to-b from-gray-900 to-gray-800">
      <Todo />
      <Footer />
    </div>
  );
}