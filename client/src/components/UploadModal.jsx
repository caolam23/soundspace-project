import React, { useState, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { X, UploadCloud, Music, Image as ImageIcon } from 'react-feather';
import './UploadModal.css';
import { toastConfig } from '../services/toastConfig';

const UploadModal = ({ roomId, onClose }) => {
  const [audioFile, setAudioFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const audioInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);

  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (!file) return;

    if (fileType === 'audio') {
      if (!file.type.startsWith('audio/')) {
        toast.error('Vui lòng chọn một file âm thanh hợp lệ.', toastConfig);
        return;
      }
      setAudioFile(file);
    } else if (fileType === 'thumbnail') {
      if (!file.type.startsWith('image/')) {
        toast.error('Vui lòng chọn một file ảnh hợp lệ.', toastConfig);
        return;
      }
      setThumbnailFile(file);
      // Tạo preview cho ảnh
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!audioFile || !thumbnailFile) {
      toast.warn('Vui lòng chọn cả file âm thanh và ảnh bìa.', toastConfig);
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('thumbnail', thumbnailFile);

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:8800/api/rooms/${roomId}/playlist/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success('Tải bài hát lên thành công!', toastConfig);
      onClose(); // Đóng modal sau khi thành công
    } catch (err) {
      const msg = err.response?.data?.msg || "Tải lên thất bại. Vui lòng thử lại.";
      toast.error(msg, toastConfig);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="upload-modal-overlay">
      <div className="upload-modal-content">
        <button className="close-button" onClick={onClose}><X size={24} /></button>
        <h2>Tải nhạc lên</h2>
        <p>Tải lên tối đa 5 bài hát cho mỗi phòng (dưới 10MB/bài)</p>
        <form onSubmit={handleSubmit} className="upload-form">
          <div className="file-drop-area" onClick={() => thumbnailInputRef.current.click()}>
            <input
              type="file"
              accept="image/*"
              ref={thumbnailInputRef}
              onChange={(e) => handleFileChange(e, 'thumbnail')}
              style={{ display: 'none' }}
            />
            {thumbnailPreview ? (
              <img src={thumbnailPreview} alt="Thumbnail preview" className="thumbnail-preview" />
            ) : (
              <div className="drop-zone-placeholder">
                <ImageIcon size={48} />
                <span>Chọn hoặc kéo thả ảnh bìa</span>
              </div>
            )}
          </div>

          <div className="file-drop-area" onClick={() => audioInputRef.current.click()}>
            <input
              type="file"
              accept="audio/*"
              ref={audioInputRef}
              onChange={(e) => handleFileChange(e, 'audio')}
              style={{ display: 'none' }}
            />
            <div className="drop-zone-placeholder">
              <Music size={48} />
              <span>{audioFile ? audioFile.name : 'Chọn hoặc kéo thả file âm thanh'}</span>
            </div>
          </div>

          <button type="submit" className="upload-button" disabled={isLoading}>
            {isLoading ? 'Đang tải lên...' : <><UploadCloud size={20} /> Tải lên</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadModal;