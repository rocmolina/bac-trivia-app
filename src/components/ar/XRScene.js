// src/components/ar/XRScene.js
"use client";

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const XRScene = () => {
    const canvasRef = useRef(null);
    let xrSession = null;

    useEffect(() => {
        const canvas = canvasRef.current;
        const renderer = new THREE.WebGLRenderer({ canvas });
        renderer.setSize(window.innerWidth, window.innerHeight);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);

        camera.position.z = 5;

        const animate = () => {
            if (!xrSession) {
                renderer.render(scene, camera);
                requestAnimationFrame(animate);
            }
        };
        animate();

        const startXR = async () => {
            if (navigator.xr) {
                try {
                    xrSession = await navigator.xr.requestSession('immersive-vr', {
                        requiredFeatures: ['local-floor'],
                    });

                    xrSession.onend = () => {
                        xrSession = null;
                    };

                    renderer.xr.enabled = true;
                    renderer.xr.setSession(xrSession);

                    const renderLoop = () => {
                        renderer.render(scene, camera);
                        xrSession.requestAnimationFrame(renderLoop);
                    };

                    xrSession.requestAnimationFrame(renderLoop);
                } catch (error) {
                    console.error('Failed to start XR:', error);
                }
            } else {
                console.error('WebXR not supported');
            }
        };

        const onResize = () => {
            renderer.setSize(window.innerWidth, window.innerHeight);
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
        };

        window.addEventListener('resize', onResize);

        startXR();

        return () => {
            window.removeEventListener('resize', onResize);
            if (xrSession) {
                xrSession.end();
            }
        };
    }, []);

    return <canvas ref={canvasRef} />;
};

export default XRScene;