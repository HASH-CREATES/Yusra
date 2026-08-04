import React from 'react';
import { motion } from 'framer-motion';

const TestComponent: React.FC = () => {
  return (
    <div className="bg-deep-carbon text-text-primary p-8 rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-4">Yusra Desktop UI Test</h1>
      <p className="text-lg">This is a test component using the Deep Carbon Liquid Glass theme.</p>
      <motion.div 
        className="mt-6 p-4 bg-glass-surface border-refractive-edge rounded-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-lg">UI components are rendering correctly!</p>
      </motion.div>
    </div>
  );
};

export default TestComponent;