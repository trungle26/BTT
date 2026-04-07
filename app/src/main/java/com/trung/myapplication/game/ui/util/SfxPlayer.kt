package com.trung.myapplication.game.ui.util

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.SoundPool
import androidx.annotation.RawRes

/**
 * Short SFX via SoundPool (load completes before play); long timer bed via MediaPlayer.
 */
object SfxPlayer {
    private var soundPool: SoundPool? = null
    /** soundId from [SoundPool.load] -> already usable with [SoundPool.play] */
    private val loadedStreamIds = mutableMapOf<String, Int>()
    /** Pending first play after async load */
    private val onSoundLoaded = mutableMapOf<Int, () -> Unit>()

    private var tickingPlayer: MediaPlayer? = null

    private fun ensurePool(): SoundPool {
        soundPool?.let { return it }
        val pool = SoundPool.Builder()
            .setMaxStreams(8)
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_GAME)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            )
            .build()
        pool.setOnLoadCompleteListener { _, sampleId, status ->
            if (status == 0) {
                onSoundLoaded.remove(sampleId)?.invoke()
            } else {
                onSoundLoaded.remove(sampleId)
            }
        }
        soundPool = pool
        return pool
    }

    private fun rawId(context: Context, rawName: String): Int {
        @RawRes val resId = context.resources.getIdentifier(rawName, "raw", context.packageName)
        return resId
    }

    fun playByName(context: Context, rawName: String) {
        if (rawName == "sfx_time_ticking") {
            startTimeoutTicking(context)
            return
        }
        val pool = ensurePool()
        val appCtx = context.applicationContext
        val resId = rawId(appCtx, rawName)
        if (resId == 0) return

        loadedStreamIds[rawName]?.let { sid ->
            pool.play(sid, 1f, 1f, 1, 0, 1f)
            return
        }

        val soundId = pool.load(appCtx, resId, 1)
        onSoundLoaded[soundId] = {
            loadedStreamIds[rawName] = soundId
            pool.play(soundId, 1f, 1f, 1, 0, 1f)
        }
    }

    /**
     * Full-length timer audio (~20s). Uses MediaPlayer — reliable for long clips.
     * Idempotent while playing.
     */
    fun startTimeoutTicking(context: Context) {
        val appCtx = context.applicationContext
        val resId = rawId(appCtx, "sfx_time_ticking")
        if (resId == 0) return
        if (tickingPlayer?.isPlaying == true) return

        stopTimeoutTicking()
        runCatching {
            MediaPlayer.create(appCtx, resId)?.apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_GAME)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                isLooping = false
                setOnCompletionListener { mp ->
                    mp.release()
                    if (tickingPlayer === mp) tickingPlayer = null
                }
                start()
                tickingPlayer = this
            }
        }
    }

    fun stopTimeoutTicking() {
        val mp = tickingPlayer ?: return
        tickingPlayer = null
        runCatching {
            if (mp.isPlaying) mp.stop()
            mp.release()
        }
    }
}
