import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Form from './Mycomponents/form.jsx';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Form />} />
      </Routes>
    </Router>
  );
}

export default App;