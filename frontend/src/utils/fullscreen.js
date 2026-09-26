/**
 * Cross-browser Fullscreen Utilities for Examination & Assessment Workspace
 */

export function isFullscreenActive() {
  return Boolean(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

export async function enterFullScreen(element = document.documentElement) {
  try {
    if (isFullscreenActive()) return true;

    if (element.requestFullscreen) {
      await element.requestFullscreen();
      return true;
    } else if (element.webkitRequestFullscreen) {
      await element.webkitRequestFullscreen();
      return true;
    } else if (element.mozRequestFullScreen) {
      await element.mozRequestFullScreen();
      return true;
    } else if (element.msRequestFullscreen) {
      await element.msRequestFullscreen();
      return true;
    }
  } catch (err) {
    console.warn("Fullscreen request could not be fulfilled:", err.message);
    return false;
  }
  return false;
}

export async function exitFullScreen() {
  try {
    if (!isFullscreenActive()) return true;

    if (document.exitFullscreen) {
      await document.exitFullscreen();
      return true;
    } else if (document.webkitExitFullscreen) {
      await document.webkitExitFullscreen();
      return true;
    } else if (document.mozCancelFullScreen) {
      await document.mozCancelFullScreen();
      return true;
    } else if (document.msExitFullscreen) {
      await document.msExitFullscreen();
      return true;
    }
  } catch (err) {
    console.warn("Exit fullscreen could not be fulfilled:", err.message);
    return false;
  }
  return false;
}

export async function toggleFullScreen(element = document.documentElement) {
  if (isFullscreenActive()) {
    await exitFullScreen();
    return false;
  } else {
    await enterFullScreen(element);
    return true;
  }
}

export function subscribeToFullscreenChange(callback) {
  const handler = () => {
    callback(isFullscreenActive());
  };

  document.addEventListener("fullscreenchange", handler);
  document.addEventListener("webkitfullscreenchange", handler);
  document.addEventListener("mozfullscreenchange", handler);
  document.addEventListener("MSFullscreenChange", handler);

  return () => {
    document.removeEventListener("fullscreenchange", handler);
    document.removeEventListener("webkitfullscreenchange", handler);
    document.removeEventListener("mozfullscreenchange", handler);
    document.removeEventListener("MSFullscreenChange", handler);
  };
}
