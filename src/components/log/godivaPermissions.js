const normalizePath = (path) => path?.replace(/:+$/, "");

export const isExperimentResponsible = (authorization, experiment) => {
  if (!experiment?.path || !Array.isArray(authorization?.isMemberOf)) return false;
  return authorization.isMemberOf.includes(`${normalizePath(experiment.path)}::resp:locale`);
};
