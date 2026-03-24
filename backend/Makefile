.PHONY: install dev train test

install:
	pip install -r requirements.txt

train:
	cd backend && python -m app.ml.train_crowd_model

dev:
	uvicorn app.main:app --reload --port 8000

test:
	pytest tests/ -v
