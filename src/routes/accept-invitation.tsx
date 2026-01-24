/**
 * Accept Invitation Route
 *
 * Handles the invitation acceptance flow when a user clicks the
 * invitation link from their email.
 *
 * Flow:
 * 1. Extract token from URL
 * 2. Fetch invitation details (public endpoint)
 * 3. User enters name and password
 * 4. Create account via acceptInvitation server function
 * 5. Redirect to dashboard
 *
 * @see src/server/functions/invitations.ts for server functions
 */
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { getInvitationByToken, acceptInvitation } from '@/server/functions/users/invitations';
import { z } from 'zod';

// Search params for the token
const acceptInvitationSearchSchema = z.object({
  token: z.string().min(1, 'Invalid invitation link'),
});

export const Route = createFileRoute('/accept-invitation')({
  validateSearch: acceptInvitationSearchSchema,
  component: AcceptInvitationPage,
});

const acceptSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required').max(100),
    lastName: z.string().min(1, 'Last name is required').max(100),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type PageState = 'loading' | 'ready' | 'submitting' | 'success' | 'error' | 'invalid';

interface InvitationDetails {
  email: string;
  role: string;
  personalMessage: string | null;
  organizationName: string | null;
  inviterName: string | null;
  expiresAt: Date;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

function AcceptInvitationPage() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();

  const fetchInvitation = useServerFn(getInvitationByToken);
  const submitAcceptance = useServerFn(acceptInvitation);

  const [pageState, setPageState] = useState<PageState>('loading');
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  // Fetch invitation details on mount
  useEffect(() => {
    const loadInvitation = async () => {
      try {
        const result = await fetchInvitation({ data: { token } });
        setInvitation({
          email: result.email,
          role: result.role,
          personalMessage: result.personalMessage,
          organizationName: result.organizationName,
          inviterName: result.inviterName,
          expiresAt: new Date(result.expiresAt),
        });
        setPageState('ready');
      } catch (err) {
        setPageState('invalid');
        setErrorMessage(err instanceof Error ? err.message : 'Invalid or expired invitation');
      }
    };

    loadInvitation();
  }, [token, fetchInvitation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form
    const validation = acceptSchema.safeParse({
      firstName,
      lastName,
      password,
      confirmPassword,
    });

    if (!validation.success) {
      const fieldErrors: FormErrors = {};
      validation.error.issues.forEach((err) => {
        const field = err.path[0] as keyof FormErrors;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setPageState('submitting');

    try {
      const result = await submitAcceptance({
        data: {
          token,
          firstName: validation.data.firstName,
          lastName: validation.data.lastName,
          password: validation.data.password,
          confirmPassword: validation.data.confirmPassword,
        },
      });

      if (result.success) {
        setPageState('success');
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate({ to: '/login' });
        }, 2000);
      }
    } catch (err) {
      setPageState('error');
      setErrors({
        general: err instanceof Error ? err.message : 'Failed to create account',
      });
    }
  };

  // Password strength indicator
  const getPasswordStrength = (pwd: string): { level: number; text: string; color: string } => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;

    if (strength <= 2) return { level: 1, text: 'Weak', color: 'bg-red-500' };
    if (strength <= 4) return { level: 2, text: 'Fair', color: 'bg-yellow-500' };
    return { level: 3, text: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(password);

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <svg
            className="mx-auto h-8 w-8 animate-spin text-indigo-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="mt-4 text-sm text-gray-600">Loading invitation details...</p>
        </div>
      </div>
    );
  }

  // Invalid invitation state
  if (pageState === 'invalid') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">Invalid Invitation</h2>
          <p className="text-sm text-gray-600">
            {errorMessage || 'This invitation link is invalid or has expired.'}
          </p>
          <div className="mt-6 space-y-3">
            <p className="text-sm text-gray-500">
              If you believe this is an error, please contact your administrator to resend the
              invitation.
            </p>
            <Link
              to="/login"
              className="flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
            >
              Go to Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (pageState === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">Welcome aboard!</h2>
          <p className="text-sm text-gray-600">
            Your account has been created successfully. You'll be redirected to sign in shortly.
          </p>
          <div className="mt-6">
            <Link
              to="/login"
              className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
            >
              Sign in now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Accept your invitation
          </h2>
          {invitation && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                You've been invited to join{' '}
                <strong className="text-gray-900">{invitation.organizationName}</strong>
                {invitation.inviterName && (
                  <>
                    {' '}
                    by <strong className="text-gray-900">{invitation.inviterName}</strong>
                  </>
                )}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Role: <span className="font-medium capitalize">{invitation.role}</span>
              </p>
              {invitation.personalMessage && (
                <div className="mt-4 rounded-md bg-gray-100 p-3 text-sm text-gray-700 italic">
                  "{invitation.personalMessage}"
                </div>
              )}
            </div>
          )}
        </div>

        {errors.general && (
          <div
            className="relative rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700"
            role="alert"
          >
            <span className="block sm:inline">{errors.general}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Email (read-only) */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={invitation?.email ?? ''}
                disabled
                className="relative mt-1 block w-full cursor-not-allowed appearance-none rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-500 sm:text-sm"
              />
            </div>

            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                First Name
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={pageState === 'submitting'}
                className={`relative mt-1 block w-full appearance-none border px-3 py-2 ${
                  errors.firstName ? 'border-red-300' : 'border-gray-300'
                } rounded-md text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 sm:text-sm`}
                placeholder="John"
              />
              {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={pageState === 'submitting'}
                className={`relative mt-1 block w-full appearance-none border px-3 py-2 ${
                  errors.lastName ? 'border-red-300' : 'border-gray-300'
                } rounded-md text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 sm:text-sm`}
                placeholder="Doe"
              />
              {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Create Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={pageState === 'submitting'}
                className={`relative mt-1 block w-full appearance-none border px-3 py-2 ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                } rounded-md text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 sm:text-sm`}
                placeholder="********"
              />
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}

              {/* Password strength indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full transition-all ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.level / 3) * 100}%` }}
                      />
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        passwordStrength.level === 1
                          ? 'text-red-600'
                          : passwordStrength.level === 2
                            ? 'text-yellow-600'
                            : 'text-green-600'
                      }`}
                    >
                      {passwordStrength.text}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={pageState === 'submitting'}
                className={`relative mt-1 block w-full appearance-none border px-3 py-2 ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                } rounded-md text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 sm:text-sm`}
                placeholder="********"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="mt-1 text-sm text-green-600">✓ Passwords match</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={pageState === 'submitting'}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pageState === 'submitting' ? (
                <span className="flex items-center">
                  <svg
                    className="mr-3 -ml-1 h-5 w-5 animate-spin text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating your account...
                </span>
              ) : (
                'Accept invitation & create account'
              )}
            </button>
          </div>

          <div className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
