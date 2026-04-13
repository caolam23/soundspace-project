import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import { submitYoutubeRequest, submitUploadRequest } from '../../store/requestSlice';
import styles from './SongRequestModal.module.css';
import {
    LuX,
    LuYoutube,
    LuUpload,
    LuMusic,
    LuSend,
    LuImage,
    LuTrash2
} from "react-icons/lu";
import { useRef } from 'react';

// ✅ FIXED: Match backend enum (lowercase)
// ✅ FIXED: Match backend enum (lowercase)
const GENRE_TAGS = [
    'vpop', 'kpop', 'us-uk', 'c-pop',
    'rap', 'hiphop', 'rnb', 'edm', 'remix',
    'indie', 'ballad', 'pop', 'rock', 'lofi', 'acoustic', 'jazz', 'dance'
];

const MOOD_TAGS = [
    'happy', 'sad', 'chill', 'energetic',
    'romantic', 'focus', 'gaming', 'sleep', 'coffee', 'travel'
];

const SongRequestModal = ({ isOpen, onClose, roomId }) => {
    const dispatch = useDispatch();
    const { submitLoading } = useSelector(state => state.requests);

    const [activeTab, setActiveTab] = useState('youtube');

    // YouTube form
    const [youtubeUrl, setYoutubeUrl] = useState('');

    // Upload form
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [thumbnailFile, setThumbnailFile] = useState(null);
    const [thumbnailPreview, setThumbnailPreview] = useState(null);
    const thumbnailInputRef = useRef(null);

    // Common
    const [selectedGenres, setSelectedGenres] = useState([]);
    const [selectedMoods, setSelectedMoods] = useState([]);

    if (!isOpen) return null;

    const toggleGenre = (genre) => {
        if (selectedGenres.includes(genre)) {
            setSelectedGenres(selectedGenres.filter(g => g !== genre));
        } else if (selectedGenres.length < 3) {
            setSelectedGenres([...selectedGenres, genre]);
        }
    };

    const toggleMood = (mood) => {
        if (selectedMoods.includes(mood)) {
            setSelectedMoods(selectedMoods.filter(m => m !== mood));
        } else {
            setSelectedMoods([...selectedMoods, mood]);
        }
    };

    const handleThumbnailChange = (e) => {
        const imgFile = e.target.files[0];
        if (!imgFile) return;
        if (!imgFile.type.startsWith('image/')) {
            toast.error('Vui lòng chọn file ảnh hợp lệ (JPG, PNG...)');
            return;
        }
        if (imgFile.size > 5 * 1024 * 1024) {
            toast.error('Ảnh bìa không được vượt quá 5MB');
            return;
        }
        setThumbnailFile(imgFile);
        const reader = new FileReader();
        reader.onloadend = () => setThumbnailPreview(reader.result);
        reader.readAsDataURL(imgFile);
    };

    const removeThumbnail = () => {
        setThumbnailFile(null);
        setThumbnailPreview(null);
        if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
    };

    const resetForm = () => {
        setYoutubeUrl('');
        setFile(null);
        setTitle('');
        setArtist('');
        setThumbnailFile(null);
        setThumbnailPreview(null);
        setSelectedGenres([]);
        setSelectedMoods([]);
        setActiveTab('youtube');
    };

    const handleClose = () => {
        if (!submitLoading) {
            resetForm();
            onClose();
        }
    };

    const handleSubmitYoutube = async (e) => {
        e.preventDefault();
        if (selectedGenres.length === 0) {
            toast.error('Vui lòng chọn ít nhất 1 thể loại');
            return;
        }
        try {
            await dispatch(submitYoutubeRequest({
                roomId,
                data: { url: youtubeUrl, tags: selectedGenres, mood: selectedMoods }
            })).unwrap();
            toast.success('🎉 Đã gửi bài hát!');
            resetForm();
            onClose();
        } catch (err) {
            toast.error(typeof err === 'string' ? err : 'Có lỗi xảy ra');
        }
    };

    const handleSubmitUpload = async (e) => {
        e.preventDefault();
        if (!file || !title || !artist) {
            toast.error('Vui lòng điền đủ thông tin');
            return;
        }
        if (!thumbnailFile) {
            toast.error('Vui lòng chọn ảnh bìa cho bài hát');
            return;
        }
        if (selectedGenres.length === 0) {
            toast.error('Vui lòng chọn ít nhất 1 thể loại');
            return;
        }
        try {
            const formData = new FormData();
            formData.append('audio', file);
            formData.append('thumbnail', thumbnailFile);
            formData.append('title', title);
            formData.append('artist', artist);
            formData.append('tags', JSON.stringify(selectedGenres));
            formData.append('mood', JSON.stringify(selectedMoods));

            await dispatch(submitUploadRequest({ roomId, formData })).unwrap();
            toast.success('🎉 Upload thành công!');
            resetForm();
            onClose();
        } catch (err) {
            toast.error(typeof err === 'string' ? err : 'Có lỗi xảy ra');
        }
    };

    return (
        <div className={styles.overlay} onClick={handleClose}>
            <div className={styles.container} onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.title}>
                        <LuMusic color="#8638e9" style={{ marginRight: '10px' }} />
                        Đề xuất bài hát
                    </h2>
                    <button className={styles.closeBtn} onClick={handleClose} disabled={submitLoading}>
                        <LuX size={24} />
                    </button>
                </div>

                {/* Tabs (Segmented Control) */}
                <div className={styles.tabsContainer}>
                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tab} ${activeTab === 'youtube' ? styles.active : ''}`}
                            onClick={() => !submitLoading && setActiveTab('youtube')}
                            disabled={submitLoading}
                        >
                            <LuYoutube size={18} /> YouTube Link
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'upload' ? styles.active : ''}`}
                            onClick={() => !submitLoading && setActiveTab('upload')}
                            disabled={submitLoading}
                        >
                            {/* ✅ ĐÃ SỬA: LuUpload */}
                            <LuUpload size={18} /> Upload MP3
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className={styles.body}>
                    {activeTab === 'youtube' ? (
                        <form onSubmit={handleSubmitYoutube}>
                            <div className={styles.formGroup}>
                                <label>Dán link YouTube</label>
                                <input
                                    type="text"
                                    value={youtubeUrl}
                                    onChange={(e) => setYoutubeUrl(e.target.value)}
                                    placeholder="https://youtube.com/watch?v=..."
                                    className={styles.input}
                                    autoFocus
                                    required
                                    disabled={submitLoading}
                                />
                            </div>

                            {/* Reusable Tags Section */}
                            <TagsSelection
                                styles={styles}
                                selectedGenres={selectedGenres}
                                toggleGenre={toggleGenre}
                                selectedMoods={selectedMoods}
                                toggleMood={toggleMood}
                                submitLoading={submitLoading}
                            />

                            <div className={styles.footer}>
                                <button type="button" onClick={handleClose} disabled={submitLoading}>
                                    Hủy bỏ
                                </button>
                                <button type="submit" className={styles.primary} disabled={submitLoading}>
                                    {submitLoading ? 'Đang gửi...' : <><LuSend /> Gửi ngay</>}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleSubmitUpload}>
                            <div className={styles.formGroup}>
                                <label>Chọn file nhạc (MP3)</label>
                                <input
                                    type="file"
                                    accept="audio/mp3,audio/mpeg"
                                    onChange={(e) => setFile(e.target.files[0] || null)}
                                    required
                                    disabled={submitLoading}
                                    className={styles.input}
                                    style={{ padding: '10px' }}
                                />
                            </div>

                            {/* Thumbnail + Song Info Row */}
                            <div className={styles.thumbnailSection}>
                                {/* Thumbnail Upload */}
                                <div className={styles.thumbnailUploadWrapper}>
                                    <label>Ảnh bìa <span className={styles.requiredMark}>*</span></label>
                                    <div
                                        className={`${styles.thumbnailUpload} ${thumbnailPreview ? styles.hasThumbnail : ''}`}
                                        onClick={() => !submitLoading && thumbnailInputRef.current?.click()}
                                    >
                                        <input
                                            type="file"
                                            accept="image/*"
                                            ref={thumbnailInputRef}
                                            onChange={handleThumbnailChange}
                                            style={{ display: 'none' }}
                                            disabled={submitLoading}
                                        />
                                        {thumbnailPreview ? (
                                            <>
                                                <img src={thumbnailPreview} alt="Cover preview" className={styles.thumbnailPreview} />
                                                <button
                                                    type="button"
                                                    className={styles.thumbnailRemove}
                                                    onClick={(e) => { e.stopPropagation(); removeThumbnail(); }}
                                                    disabled={submitLoading}
                                                    title="Xóa ảnh bìa"
                                                >
                                                    <LuTrash2 size={14} />
                                                </button>
                                            </>
                                        ) : (
                                            <div className={styles.thumbnailPlaceholder}>
                                                <LuImage size={24} />
                                                <span>Chọn ảnh</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Song Info Fields */}
                                <div className={styles.songInfoFields}>
                                    <div className={styles.formGroup}>
                                        <label>Tên bài hát</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className={styles.input}
                                            required
                                            disabled={submitLoading}
                                            placeholder="Ví dụ: Em của ngày hôm qua"
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Ca sĩ</label>
                                        <input
                                            type="text"
                                            value={artist}
                                            onChange={(e) => setArtist(e.target.value)}
                                            className={styles.input}
                                            required
                                            disabled={submitLoading}
                                            placeholder="Ví dụ: Sơn Tùng M-TP"
                                        />
                                    </div>
                                </div>
                            </div>

                            <TagsSelection
                                styles={styles}
                                selectedGenres={selectedGenres}
                                toggleGenre={toggleGenre}
                                selectedMoods={selectedMoods}
                                toggleMood={toggleMood}
                                submitLoading={submitLoading}
                            />

                            <div className={styles.footer}>
                                <button type="button" onClick={handleClose} disabled={submitLoading}>
                                    Hủy bỏ
                                </button>
                                <button type="submit" className={styles.primary} disabled={submitLoading}>
                                    {/* ✅ ĐÃ SỬA: LuUpload */}
                                    {submitLoading ? 'Đang tải lên...' : <><LuUpload /> Upload</>}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

// Tách Component con cho gọn code
const TagsSelection = ({ styles, selectedGenres, toggleGenre, selectedMoods, toggleMood, submitLoading }) => (
    <>
        <div className={styles.formGroup}>
            <label>Thể loại (Chọn tối đa 3)</label>
            <div className={styles.tagButtons}>
                {GENRE_TAGS.map(genre => (
                    <button
                        key={genre}
                        type="button"
                        className={`${styles.tagBtn} ${selectedGenres.includes(genre) ? styles.tagActive : ''}`}
                        onClick={() => !submitLoading && toggleGenre(genre)}
                        disabled={submitLoading}
                    >
                        {genre}
                    </button>
                ))}
            </div>
        </div>

        <div className={styles.formGroup}>
            <label>Tâm trạng (Tùy chọn)</label>
            <div className={styles.tagButtons}>
                {MOOD_TAGS.map(mood => (
                    <button
                        key={mood}
                        type="button"
                        className={`${styles.tagBtn} ${selectedMoods.includes(mood) ? styles.tagActive : ''}`}
                        onClick={() => !submitLoading && toggleMood(mood)}
                        disabled={submitLoading}
                    >
                        {mood}
                    </button>
                ))}
            </div>
        </div>
    </>
);

export default SongRequestModal;