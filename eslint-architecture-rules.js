/**
 * ESLint Rules for Container/Presenter Architecture Enforcement
 *
 * This file contains ESLint rules to prevent common architecture violations:
 * 1. useQuery/useMutation in presenter components
 * 2. Server function imports in components
 * 3. Inline query keys instead of centralized queryKeys.*
 *
 * Integration:
 * - Import these rules in eslint.config.js
 * - Apply to domain components in src/components/domain
 * - Exempt routes, hooks, and shared/ui components
 *
 * @see PREVENTION_STRATEGIES.md for context
 */

/**
 * Rules for domain presenters only
 * Located in: src/components/domain/**\/*.{ts,tsx}
 */
export const domainPresenterRules = {
  files: ['src/components/domain/**/*.{ts,tsx}'],
  rules: {
    // =========================================================================
    // RULE 1: Prevent data fetching hooks in presenter components
    // =========================================================================
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@tanstack/react-query'],
            importNames: [
              'useQuery',
              'useMutation',
              'useInfiniteQuery',
              'useQueries',
              'useQueryClient',
              'useSuspenseQuery',
              'useSuspenseInfiniteQuery',
            ],
            message: `
              ❌ Data fetching hooks are not allowed in presenter components.

              🏗️  ARCHITECTURE RULE:
              - Presenter components should ONLY receive data via props
              - Data fetching belongs in routes (containers) or custom hooks
              - Move useQuery/useMutation to a custom hook in src/hooks/
              - Or move to route in src/routes/

              ✅ CORRECT PATTERN:
              // hooks/customers/use-customers.ts
              export function useCustomers(filters) {
                return useQuery({
                  queryKey: queryKeys.customers.list(filters),
                  queryFn: () => getCustomers({ data: filters }),
                });
              }

              // routes/_authenticated/customers/index.tsx
              const { data: customers } = useCustomers();
              return <CustomerList customers={customers} />;

              // components/domain/customers/customer-list.tsx
              export function CustomerList({ customers }) {
                // No hooks here! Just render the data
                return <div>{customers.map(...)}</div>;
              }

              📖 Read: PREVENTION_STRATEGIES.md
              🔗 See: src/hooks/ for hook examples
            `.trim(),
          },
        ],
      },
    ],

    // =========================================================================
    // RULE 2: Prevent server function imports in components
    // =========================================================================
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/server/functions/**'],
            message: `
              ❌ Server functions cannot be imported in components.

              🏗️  ARCHITECTURE RULE:
              - Components cannot call server functions directly
              - Server functions should be used in routes or hooks only
              - Pass callbacks as props from container layer

              ✅ CORRECT PATTERN:
              // hooks/customers/use-create-customer.ts
              export function useCreateCustomer() {
                return useMutation({
                  mutationFn: (data) => createCustomer({ data }),
                  onSuccess: () => {
                    queryClient.invalidateQueries({
                      queryKey: queryKeys.customers.lists()
                    });
                  },
                });
              }

              // routes/customers/new.tsx
              const { mutate: createCustomer } = useCreateCustomer();
              return <CustomerForm onSubmit={createCustomer} />;

              // components/domain/customers/customer-form.tsx
              export function CustomerForm({ onSubmit }) {
                // No server function imports! Just callbacks
                return <form onSubmit={(data) => onSubmit(data)} />;
              }

              📖 Read: PREVENTION_STRATEGIES.md
              🔗 See: src/server/functions/ for function examples
            `.trim(),
          },
        ],
      },
    ],

    // =========================================================================
    // RULE 3: Warn about useState + useEffect patterns
    // (May be used legitimately for UI state, so warn not error)
    // =========================================================================
    'no-restricted-syntax': [
      'warn',
      {
        selector:
          'CallExpression[callee.name="useState"] ~ CallExpression[callee.name="useEffect"]',
        message: `
          ⚠️  Possible manual data fetching detected.

          🤔 If this is useState + useEffect for DATA fetching:
          ❌ Don't use useState + useEffect for data - use TanStack Query
          ✅ Use useQuery instead

          ✅ If this is for UI STATE only:
          This is fine! Just make sure it's not also fetching data.
          Examples of valid UI state:
          - useState(false) for isModalOpen
          - useState([]) for selectedRows
          - useState('tab1') for activeTab

          📖 Read: PREVENTION_STRATEGIES.md for examples
        `.trim(),
      },
    ],
  },
};

/**
 * Rules for routes/hooks (data fetching layer)
 * Located in: src/routes/**\/*.{ts,tsx} and src/hooks/**\/*.{ts,tsx}
 * These are EXEMPT from presenter rules
 */
export const dataFetchingRules = {
  files: ['src/routes/**/*.{ts,tsx}', 'src/hooks/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': 'off',
    'no-restricted-syntax': 'off',
  },
};

/**
 * Rules for shared/ui components
 * Located in: src/components/shared/**\/*.{ts,tsx}, src/components/ui/**\/*.{ts,tsx}
 * These may use hooks for UI state management
 */
export const sharedComponentRules = {
  files: [
    'src/components/shared/**/*.{ts,tsx}',
    'src/components/ui/**/*.{ts,tsx}',
  ],
  rules: {
    // Allow hooks in shared components (they're utilities)
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/server/functions/**'],
            message: 'Server functions cannot be imported in shared components.',
          },
        ],
      },
    ],
  },
};

/**
 * Query Key Enforcement
 * Applied globally to catch inline query key definitions
 */
export const queryKeyEnforcementRules = {
  files: ['src/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-patterns': [
      'warn',
      {
        pattern: /queryKey:\s*\[\s*['"`]/,
        message: `
          ⚠️  Inline query key detected. Use queryKeys.* instead.

          🏗️  ARCHITECTURE RULE:
          - Query keys must be centralized in src/lib/query-keys.ts
          - This enables cache invalidation and reuse

          ❌ WRONG:
          useQuery({
            queryKey: ['customers', id],
            queryFn: () => getCustomer(id),
          });

          ✅ CORRECT:
          useQuery({
            queryKey: queryKeys.customers.detail(id),
            queryFn: () => getCustomer(id),
          });

          📖 Read: src/lib/query-keys.ts for available keys
          📖 Read: PREVENTION_STRATEGIES.md section 2.2
        `.trim(),
      },
    ],
  },
};

/**
 * Complete configuration to add to eslint.config.js
 *
 * Integration example:
 * ```javascript
 * import {
 *   domainPresenterRules,
 *   dataFetchingRules,
 *   sharedComponentRules,
 * } from './eslint-architecture-rules.js';
 *
 * export default [
 *   // ... existing configs
 *   domainPresenterRules,
 *   dataFetchingRules,
 *   sharedComponentRules,
 *   // ... other configs
 * ];
 * ```
 */

/**
 * Summary of Rules
 *
 * DOMAIN PRESENTER RULES (src/components/domain):
 * ✅ Cannot import useQuery, useMutation, etc.
 * ✅ Cannot import @/server/functions
 * ✅ Should only receive data via props
 * ✅ Can use useState for UI state only
 *
 * DATA FETCHING RULES (src/routes, src/hooks):
 * ✅ Can use useQuery, useMutation, etc.
 * ✅ Can import server functions
 * ✅ Must use centralized queryKeys.*
 * ✅ Should invalidate caches on mutations
 *
 * SHARED/UI RULES (src/components/shared, src/components/ui):
 * ✅ Can use hooks for UI state
 * ✅ Cannot import server functions
 * ✅ Should be reusable and independent
 *
 * GLOBAL RULES (all files):
 * ✅ Must use queryKeys.* from @/lib/query-keys.ts
 * ✅ Never define query keys inline
 * ✅ Use TanStack Query for all data fetching
 * ✅ Use refetchInterval instead of setInterval
 */
