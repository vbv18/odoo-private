import React from 'react';
import Link from 'next/link';
import AuthLayout from '../components/AuthLayout';
import { Logo } from '../components/ui/Logo';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // TODO: Implement password reset logic
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
          <h1 className="text-2xl font-semibold text-primary-text">Forgot Password?</h1>
          <p className="text-secondary-text">No worries, we'll help you reset it</p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" className="w-full">
              SEND RESET LINK
            </Button>
          </form>
        ) : (
          <div className="bg-primary-green/10 border border-primary-green rounded-enterprise p-4">
            <p className="text-sm text-primary-green">
              Check your email for password reset instructions.
            </p>
          </div>
        )}

        <div className="text-center text-sm">
          <Link href="/login" className="text-ai-blue hover:text-blue-700">
            Back to sign in
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
