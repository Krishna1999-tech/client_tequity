
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import FileUpload from './components/FileUpload';

function App() {
  return (
    <BrowserRouter>
      <Routes>
      
      
        <Route path="/" element={<FileUpload />} />
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;
