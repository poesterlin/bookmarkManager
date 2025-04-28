/// <reference lib="webworker" />

import { expose } from 'comlink';

function isImageTooDark(imageData: ImageData) {
	const { data } = imageData;
	let totalBrightness = 0;
	let pixelCount = 0;

	for (let i = 0; i < data.length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		const brightness = (r + g + b) / 3;
		totalBrightness += brightness;
		pixelCount++;
	}

	const averageBrightness = totalBrightness / pixelCount;
	return averageBrightness < 50;
}

async function getImage(id: string) {
	const response = await fetch(`/icon/${id}`);
	if (!response.ok) {
		throw new Error('Network response was not ok');
	}

	const contentType = response.headers.get('Content-Type') ?? 'image/png';
	const isSvg = contentType === 'image/svg+xml';

	if (isSvg) {
		const svgText = await response.text();
		return { svgText, isSvg };
	}

	const blob = await response.blob();
	return { blob, isSvg };
}

async function getImageData(blob: Blob) {
	try {
		const imageBitmap = await createImageBitmap(blob);
		const { canvas, ctx } = makeCanvas(imageBitmap);

		ctx.drawImage(imageBitmap, 0, 0);
		return ctx.getImageData(0, 0, canvas.width, canvas.height);
	} catch (error) {
		console.error('Error creating image bitmap:', error);
		throw new Error('Failed to create image bitmap');
	}
}

async function invertImage(imageData: ImageData): Promise<ImageData> {
	const { data } = imageData;
	const invertedData = new Uint8ClampedArray(data.length);

	for (let i = 0; i < data.length; i += 4) {
		invertedData[i] = 255 - data[i]; // Invert Red
		invertedData[i + 1] = 255 - data[i + 1]; // Invert Green
		invertedData[i + 2] = 255 - data[i + 2]; // Invert Blue
		invertedData[i + 3] = data[i + 3]; // Alpha remains the same
	}

	return new ImageData(invertedData, imageData.width, imageData.height);
}

async function processImage(blob: Blob) {
	const imageData = await getImageData(blob);
	const isDark = isImageTooDark(imageData);
	if (isDark) {
		return invertImage(imageData);
	} else {
		return imageData;
	}
}

async function getProcessedImageUrl(id: string): Promise<string> {
	try {
		const { blob, isSvg, svgText } = await getImage(id);

		if (isSvg) {
            console.log('http://localhost:5173/icon/' + id);
            const blob = await fetch('http://localhost:5173/icon/' + id).then((res) => res.blob());
            const url = URL.createObjectURL(blob);
            console.log('Blob URL:', url);
			return whiteSvg(svgText);
		}

		const imageData = await processImage(blob);
		const { canvas, ctx } = makeCanvas(imageData);
		ctx.putImageData(imageData, 0, 0);
		const output = await canvas.convertToBlob();
		return URL.createObjectURL(output);
	} catch (error) {
		console.error('Error processing image:', error);
		return `/icon/${id}`;
	}
}

function extractPathDataWithRegex(svgText: string): string[] {
	const pathDataList: string[] = [];
	const pathRegex = /<path\s+(?:[^>]*?\s+)?d\s*=\s*(["'])(.*?)\1[^>]*>/gi;

	let match;
	while ((match = pathRegex.exec(svgText)) !== null) {
		// The actual path data is in the second capturing group (index 2)
		if (match[2]) {
			pathDataList.push(match[2].trim()); // Trim whitespace just in case
		}
	}

    return pathDataList;
}

async function whiteSvg(svgText: string) {
	try {
        const viewBox = svgText.match(/viewBox="([^"]+)"/);
        const width = viewBox ? viewBox[1].split(' ')[2] : 32; // Default to 100 if not found

		const { ctx, canvas } = makeCanvas({ width: Number(width), height: Number(width) });
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'black';

		const dAttributes = extractPathDataWithRegex(svgText);
		if (dAttributes.length === 0) {
			throw new Error('No path data found in SVG');
		}

		for (let i = 0; i < dAttributes.length; i++) {
            const dAttribute = dAttributes[i];
			const path2d = new Path2D(dAttribute);

			ctx.fillStyle = lerp(220, 20, i / dAttributes.length);
			ctx.fill(path2d);
		}

		const output = await canvas.convertToBlob();
		return URL.createObjectURL(output);
	} catch (error) {
		console.error('Worker: Error processing SVG path:', error);
		throw new Error('Failed to process SVG path');
	}
}

function lerp(a: number, b: number, t: number) {
    const brightness = a + (b - a) * t;

    const round = Math.round(brightness);
    const hex = round.toString(16).padStart(2, '0');
    return `#${hex}${hex}${hex}`;
}

function makeCanvas(config: { width: number; height: number }) {
	const { width, height } = config;
	const canvas = new OffscreenCanvas(width, height);
	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext('2d');
	if (!ctx) {
		throw new Error('Failed to get canvas context');
	}

	return { canvas, ctx };
}

const methods = {
	getProcessedImageUrl
};

export type ImageWorker = typeof methods;

expose(methods);
