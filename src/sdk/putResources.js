'use strict';
const throat = require('throat');

const DEFAULT_CONCURRENCY_LIMIT = 100;

/************************
 *    This is PUTIN!    *
 ************************/

function makePutResources(concurrency = DEFAULT_CONCURRENCY_LIMIT) {
  const putPromises = {};
  return async function putResources(rGridDom, runningRender, wrapper, allResources = []) {
    const resources = []; // this will contain all the resources that need to be PUT (asked for + not already sent)
    const existingPromises = [];
    if (runningRender.getNeedMoreDom()) {
      processResource(rGridDom.asResource(), resources, existingPromises);
    }

    const needMoreResources = runningRender.getNeedMoreResources();
    if (needMoreResources) {
      const availableReosurces = Array.from(new Set(allResources.concat(rGridDom.getResources())));
      for (const resource of availableReosurces) {
        if (needMoreResources.includes(resource.getUrl())) {
          processResource(resource, resources, existingPromises);
        }
      }
    }

    const newPromises = resources.map(
      throat(concurrency, resource => doPutResource(resource, runningRender, wrapper)),
    );

    return Promise.all(existingPromises.concat(newPromises));
  };

  function processResource(resource, resources, promises) {
    const resourcePromise = putPromises[resource.getSha256Hash()];
    if (resourcePromise) {
      promises.push(resourcePromise);
    } else {
      resources.push(resource);
    }
  }

  function doPutResource(resource, runningRender, wrapper) {
    const promise = wrapper.putResource(runningRender, resource);
    putPromises[resource.getSha256Hash()] = promise;
    return promise;
  }
}

module.exports = makePutResources;
