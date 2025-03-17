import React from 'react';

const baseStyles = {
  card: {
    border: '1px solid #e2e8f0',
    borderRadius: '0.375rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    background: 'white',
    margin: '1rem 0',
  },
  cardHeader: {
    padding: '1rem',
    borderBottom: '1px solid #e2e8f0',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
  },
  cardContent: {
    padding: '1rem',
  },
  input: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #e2e8f0',
    borderRadius: '0.25rem',
    marginBottom: '0.5rem',
  },
  button: {
    padding: '0.5rem 1rem',
    backgroundColor: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '0.25rem',
    cursor: 'pointer',
  },
  label: {
    display: 'block',
    marginBottom: '0.25rem',
    fontWeight: 'bold',
  },
};

export const Card = ({ children, style, ...props }) => (
  <div style={{ ...baseStyles.card, ...style }} {...props}>{children}</div>
);

export const CardHeader = ({ children, style, ...props }) => (
  <div style={{ ...baseStyles.cardHeader, ...style }} {...props}>{children}</div>
);

export const CardTitle = ({ children, style, ...props }) => (
  <h3 style={{ ...baseStyles.cardTitle, ...style }} {...props}>{children}</h3>
);

export const CardContent = ({ children, style, ...props }) => (
  <div style={{ ...baseStyles.cardContent, ...style }} {...props}>{children}</div>
);

export const Input = ({ style, ...props }) => (
  <input style={{ ...baseStyles.input, ...style }} {...props} />
);

export const Button = ({ children, style, ...props }) => (
  <button style={{ ...baseStyles.button, ...style }} {...props}>{children}</button>
);

export const Label = ({ children, style, ...props }) => (
  <label style={{ ...baseStyles.label, ...style }} {...props}>{children}</label>
);