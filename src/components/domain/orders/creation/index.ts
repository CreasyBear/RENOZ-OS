/**
 * Order Creation Components
 *
 * OrderCreationWizard is exported from order-creation-wizard.tsx (main file with onSubmit
 * and initialCustomerId). The order-creation-wizard/ folder contains step components
 * used by the folder's alternate wizard - we use the main file explicitly to avoid
 * resolution ambiguity when both file and folder exist.
 */
export { CustomerSelector } from './customer-selector';
export { ProductSelector } from './product-selector';
export {
  OrderCreationWizard,
  type OrderCreationWizardProps,
  type OrderSubmitData,
} from './order-creation-wizard.tsx';
