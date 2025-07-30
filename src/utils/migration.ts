export function migrateModelSettings(): void {
  // Check if migration has already been done
  if (localStorage.getItem('model-settings-migrated') === 'true') {
    return;
  }

  // Get the current default model
  const defaultModel = localStorage.getItem('openai-model');
  
  // Only migrate if the default model exists and advanced settings don't
  if (defaultModel && 
      !localStorage.getItem('openai-model-preprocessing') &&
      !localStorage.getItem('openai-model-outline') &&
      !localStorage.getItem('openai-model-generation')) {
    
    // Set all advanced models to the default model
    localStorage.setItem('openai-model-preprocessing', defaultModel);
    localStorage.setItem('openai-model-outline', defaultModel);
    localStorage.setItem('openai-model-generation', defaultModel);
  }
  
  // Mark migration as complete
  localStorage.setItem('model-settings-migrated', 'true');
}