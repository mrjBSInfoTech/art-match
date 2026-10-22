export const preventArtworkImageActions = (event) => {
  event.preventDefault();
};

export const artworkImageProtectionProps = {
  draggable: false,
  onContextMenu: preventArtworkImageActions,
  onDragStart: preventArtworkImageActions,
};

export const artworkImageProtectionSx = {
  userSelect: "none",
  WebkitUserDrag: "none",
  WebkitTouchCallout: "none",
};
