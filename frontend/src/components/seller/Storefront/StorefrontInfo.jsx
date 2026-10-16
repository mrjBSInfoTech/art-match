import ArtworkInfo from "../Artwork/ArtworkInfo";

export default function StorefrontInfo({ open, handleClose, selectedArtwork }) {
  return (
    <ArtworkInfo
      open={open}
      handleClose={handleClose}
      selectedArtwork={selectedArtwork}
      canEdit={false}
    />
  );
}
