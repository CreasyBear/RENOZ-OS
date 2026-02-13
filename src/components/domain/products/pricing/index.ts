/**
 * Product Pricing Components
 */
export { CustomerPricing } from './customer-pricing';
export { PriceHistory } from './price-history';
export { PriceTiers } from './price-tiers';
// Container/Presenter pattern per STANDARDS.md
export { PricingEngineContainer } from './pricing-engine-container';
export { PricingEngineView } from './pricing-engine-view';

// Legacy export for backwards compatibility (use PricingEngineContainer)
export { PricingEngineContainer as PricingEngine } from './pricing-engine-container';
