import React, { useState } from 'react';
import AuthLayout from '../components/AuthLayout';
import { Logo } from '../components/ui/Logo';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

interface FormData {
  name: string;
  loginId: string;
  email: string;
  role: string;
  password: string;
  confirmPassword: string;
}

interface ValidationErrors {
  [key: string]: string;
}

const CreateAccountPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    loginId: '',
    email: '',
    role: 'user',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.loginId) {
      newErrors.loginId = 'Login ID is required';
    } else if (formData.loginId.length < 6 || formData.loginId.length > 12) {
      newErrors.loginId = 'Login ID must be between 6-12 characters';
    }

    if (!formData.email) {
      newErrors.email = 'Email ID is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length <= 8) {
      newErrors.password = 'Password must be more than 8 characters';
    } else if (!/(?=.*[a-z])/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one lowercase letter';
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter';
    } else if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one special character';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          loginId: formData.loginId,
          email: formData.email,
          role: formData.role,
          password: formData.password,
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Account created successfully!');
        setFormData({
          name: '',
          loginId: '',
          email: '',
          role: 'user',
          password: '',
          confirmPassword: '',
        });
        setErrors({});
      } else {
        setErrors({ general: data.message || 'Account creation failed' });
      }
    } catch (error) {
      console.error('Create account error:', error);
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, role: e.target.value }));
  };

  return (
    <AuthLayout>
      <div className="space-y-8">
        <div className="lg:hidden flex justify-center">
          <Logo />
        </div>

        <div className="space-y-2">
          <div className="hidden lg:block mb-6">
            <Logo />
          </div>
          <h1 className="text-2xl font-semibold text-primary-text">Create User Account</h1>
          <p className="text-secondary-text">Add new users to the system</p>
        </div>

        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-enterprise text-sm text-danger">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Input
              type="text"
              name="name"
              placeholder="Name"
              value={formData.name}
              onChange={handleInputChange}
              error={errors.name}
              required
            />
            
            <Input
              type="text"
              name="loginId"
              placeholder="Login id"
              value={formData.loginId}
              onChange={handleInputChange}
              error={errors.loginId}
              required
            />
            
            <Input
              type="email"
              name="email"
              placeholder="E-mail id"
              value={formData.email}
              onChange={handleInputChange}
              error={errors.email}
              required
            />

            <div className="space-y-3">
              <label className="block text-sm font-medium text-primary-text">Role</label>
              <div className="flex space-x-6">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="user"
                    checked={formData.role === 'user'}
                    onChange={handleRoleChange}
                    className="h-4 w-4"
                  />
                  <span className="ml-2 text-sm text-secondary-text">User</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={formData.role === 'admin'}
                    onChange={handleRoleChange}
                    className="h-4 w-4"
                  />
                  <span className="ml-2 text-sm text-secondary-text">Administrator</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="accountant"
                    checked={formData.role === 'accountant'}
                    onChange={handleRoleChange}
                    className="h-4 w-4"
                  />
                  <span className="ml-2 text-sm text-secondary-text">Accountant</span>
                </label>
              </div>
            </div>
            
            <Input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              error={errors.password}
              required
            />
            
            <Input
              type="password"
              name="confirmPassword"
              placeholder="Re-Enter Password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              error={errors.confirmPassword}
              required
            />
          </div>

          <div className="flex space-x-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating...' : 'Create'}
            </Button>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => {
                setFormData({
                  name: '',
                  loginId: '',
                  email: '',
                  role: 'user',
                  password: '',
                  confirmPassword: '',
                });
                setErrors({});
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>

        <div className="bg-gray-50 p-4 rounded-enterprise border border-border">
          <p className="text-xs font-semibold text-primary-text mb-3">Role Permissions:</p>
          <div className="text-xs text-secondary-text space-y-2">
            <div className="flex">
              <span className="font-medium text-ai-blue mr-2 min-w-fit">Admin –</span>
              <span>Have all access rights</span>
            </div>
            <div className="flex">
              <span className="font-medium text-ai-blue mr-2 min-w-fit">User –</span>
              <span>Can only see his invoices/bills in paid/unpaid status</span>
            </div>
            <div className="flex">
              <span className="font-medium text-ai-blue mr-2 min-w-fit">Accountant –</span>
              <span>Create master data, journal entries, bills, invoices, and manage customers/vendors</span>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default CreateAccountPage;
